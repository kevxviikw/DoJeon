#!/usr/bin/env node
// One script to bring the linked Supabase project's auth providers into the
// state the app expects. Supersedes set-email-otp.mjs + setup-auth-email.mjs.
//
// It PATCHes only the fields listed below on
//   https://api.supabase.com/v1/projects/{ref}/config/auth
// Each of the three sections is independent: a section is applied only when
// its inputs are present in the environment, otherwise it's skipped and
// noted. Run `check-auth-config.mjs` first to see the current state.
//
// ---------------------------------------------------------------------
// COMMON SETUP
//   Access token:  https://supabase.com/dashboard/account/tokens
//   PowerShell:    $env:SUPABASE_ACCESS_TOKEN="sbp_..."
//   bash:          export SUPABASE_ACCESS_TOKEN=sbp_...
//   Project ref is read from supabase/.temp/project-ref (`supabase link`)
//   or SUPABASE_PROJECT_REF.
//
// ---------------------------------------------------------------------
// 1. EMAIL (6-digit code over Resend SMTP)   -- needs: RESEND_API_KEY
//   RESEND_API_KEY      re_...   (Resend -> API Keys)
//   SMTP_SENDER         from address on your VERIFIED Resend domain
//                       e.g. auth@dojeon.app   (default onboarding@resend.dev,
//                       which only delivers to your own Resend login address)
//   SMTP_SENDER_NAME    inbox from-name          (default "DoJeon")
//   EMAIL_RATE_LIMIT    emails per hour          (default 100)
//
// 2. APPLE (native Sign in with Apple)       -- needs: ENABLE_APPLE=1
//   APPLE_CLIENT_IDS    comma-separated allowed client ids / bundle ids
//                       (default "com.pic.dojeon" -- the app's iOS bundle id)
//   No client secret is required for the native identity-token flow.
//
// 3. PHONE (6-digit code over Twilio SMS)     -- needs: TWILIO_ACCOUNT_SID
//   TWILIO_ACCOUNT_SID           AC...
//   TWILIO_AUTH_TOKEN            (Twilio console -> Account -> API keys & tokens)
//   TWILIO_MESSAGE_SERVICE_SID   MG...  OR a purchased from-number in E.164
//   SMS_RATE_LIMIT              messages per hour   (default 30)
//
// Add --dry-run to print the payload (secrets masked) without sending.
// ---------------------------------------------------------------------

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const supabaseDir = join(here, ".."); // Dojeon/app/supabase
const readIf = (p) => (existsSync(p) ? readFileSync(p, "utf8").trim() : null);
const tpl = (name) => readFileSync(join(supabaseDir, "templates", name), "utf8");

const DEFAULT_APPLE_CLIENT_IDS = "com.pic.dojeon";
const dryRun = process.argv.includes("--dry-run");

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  readIf(join(supabaseDir, ".temp", "project-ref"));
const token =
  process.env.SUPABASE_ACCESS_TOKEN ||
  readIf(join(homedir(), ".supabase", "access-token"));

const die = (m) => { console.error("\n" + m + "\n"); process.exit(1); };
if (!ref) die("No project ref. Run `npx supabase link` or set SUPABASE_PROJECT_REF.");
if (!token && !dryRun) {
  die(
    "No Supabase access token.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens then:\n" +
      '  PowerShell:  $env:SUPABASE_ACCESS_TOKEN="sbp_..."\n' +
      "  bash:        export SUPABASE_ACCESS_TOKEN=sbp_..."
  );
}

const body = {};
const applied = [];
const skipped = [];

// --- 1. EMAIL --------------------------------------------------------
const resendKey = process.env.RESEND_API_KEY || null;
if (resendKey) {
  const sender = process.env.SMTP_SENDER || "onboarding@resend.dev";
  Object.assign(body, {
    external_email_enabled: true,
    smtp_admin_email: sender,
    smtp_host: "smtp.resend.com",
    smtp_port: 465,
    smtp_user: "resend",
    smtp_pass: resendKey,
    smtp_sender_name: process.env.SMTP_SENDER_NAME || "DoJeon",
    smtp_max_frequency: 1,
    mailer_otp_length: 6,
    mailer_otp_exp: 3600,
    mailer_subjects_magic_link: "Your DoJeon sign-in code",
    mailer_subjects_confirmation: "Your DoJeon sign-in code",
    mailer_subjects_recovery: "Your DoJeon password reset code",
    mailer_templates_magic_link_content: tpl("magic_link.html"),
    mailer_templates_confirmation_content: tpl("confirmation.html"),
    mailer_templates_recovery_content: tpl("recovery.html"),
    rate_limit_email_sent: Number(process.env.EMAIL_RATE_LIMIT || 100),
  });
  applied.push(
    `EMAIL   sender=${sender}` +
      (sender === "onboarding@resend.dev"
        ? "  (⚠ only reaches your own Resend login address)"
        : "")
  );
} else {
  skipped.push("EMAIL   (set RESEND_API_KEY, and SMTP_SENDER on your verified domain)");
}

// --- 2. APPLE ------------------------------------------------------
if (process.env.ENABLE_APPLE === "1") {
  const ids = (process.env.APPLE_CLIENT_IDS || DEFAULT_APPLE_CLIENT_IDS)
    .split(",").map((s) => s.trim()).filter(Boolean);
  Object.assign(body, {
    external_apple_enabled: true,
    // First id is the primary client id; the rest are additional allowed
    // 'aud' values. For a native-only app every entry is a bundle id.
    external_apple_client_id: ids[0],
    external_apple_additional_client_ids: ids.join(","),
  });
  applied.push(`APPLE   enabled, client ids=[${ids.join(", ")}]`);
} else {
  skipped.push("APPLE   (set ENABLE_APPLE=1; optionally APPLE_CLIENT_IDS=...)");
}

// --- 3. PHONE ----------------------------------------------------
const twilioSid = process.env.TWILIO_ACCOUNT_SID || null;
if (twilioSid) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const msgSvc = process.env.TWILIO_MESSAGE_SERVICE_SID;
  if (!authToken || !msgSvc) {
    die("PHONE: TWILIO_ACCOUNT_SID is set but TWILIO_AUTH_TOKEN and/or\nTWILIO_MESSAGE_SERVICE_SID (MG... or a from-number) are missing.");
  }
  Object.assign(body, {
    external_phone_enabled: true,
    sms_provider: "twilio",
    sms_twilio_account_sid: twilioSid,
    sms_twilio_auth_token: authToken,
    sms_twilio_message_service_sid: msgSvc,
    sms_otp_length: 6,
    sms_otp_exp: 600,
    sms_max_frequency: 60,
    sms_template: "Your DoJeon code is {{ .Code }}",
    rate_limit_sms_sent: Number(process.env.SMS_RATE_LIMIT || 30),
  });
  applied.push(`PHONE   enabled, twilio sid=${twilioSid.slice(0, 4)}…${twilioSid.slice(-4)}`);
} else {
  skipped.push("PHONE   (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGE_SERVICE_SID)");
}

// --- send ----------------------------------------------------------
if (Object.keys(body).length === 0) {
  die("Nothing to do -- no section had its inputs set. See the header comment.");
}

const summary = () => {
  console.log(`\nProject: ${ref}`);
  if (applied.length) console.log("\nApplying:\n  " + applied.join("\n  "));
  if (skipped.length) console.log("\nSkipped:\n  " + skipped.join("\n  "));
};

if (dryRun) {
  summary();
  const masked = { ...body };
  for (const k of ["smtp_pass", "sms_twilio_auth_token", "external_apple_secret"]) {
    if (masked[k]) masked[k] = masked[k].slice(0, 4) + "…" + masked[k].slice(-4);
  }
  for (const k of Object.keys(masked)) {
    if (k.startsWith("mailer_templates_")) masked[k] = `<${masked[k].length} chars>`;
  }
  console.log("\nPayload (dry run, not sent):");
  console.log(JSON.stringify(masked, null, 2));
  process.exit(0);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) die(`PATCH ${res.status} ${res.statusText}\n${text}`);
const j = JSON.parse(text);

summary();
console.log("\nDone. Live values now:");
const row = (k, v) => console.log(`  ${k.padEnd(36)} ${v ?? "(unset)"}`);
if (resendKey) {
  row("external_email_enabled", j.external_email_enabled);
  row("smtp_admin_email", j.smtp_admin_email);
  row("mailer_otp_length", j.mailer_otp_length);
  row("rate_limit_email_sent", j.rate_limit_email_sent);
}
if (process.env.ENABLE_APPLE === "1") {
  row("external_apple_enabled", j.external_apple_enabled);
  row("external_apple_client_id", j.external_apple_client_id);
  row("external_apple_additional_client_ids", j.external_apple_additional_client_ids);
}
if (twilioSid) {
  row("external_phone_enabled", j.external_phone_enabled);
  row("sms_provider", j.sms_provider);
  row("sms_twilio_message_service_sid", j.sms_twilio_message_service_sid);
  row("sms_otp_length", j.sms_otp_length);
}
console.log(
  "\nNext: request a code / tap Sign in with Apple in the app. If email still\n" +
    "doesn't arrive, check the Resend dashboard 'Emails' log for a bounce.\n"
);
