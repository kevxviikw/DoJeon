#!/usr/bin/env node
// Read-only: dump the linked Supabase project's live auth config so we can
// see WHY a provider isn't working instead of guessing. Touches nothing.
//
// Usage (PowerShell):
//   $env:SUPABASE_ACCESS_TOKEN="sbp_..."; node supabase/scripts/check-auth-config.mjs
// Usage (bash):
//   SUPABASE_ACCESS_TOKEN=sbp_... node supabase/scripts/check-auth-config.mjs
//
// Access token: https://supabase.com/dashboard/account/tokens
// Project ref is read from supabase/.temp/project-ref (set by `supabase link`)
// or SUPABASE_PROJECT_REF.

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const supabaseDir = join(here, "..");
const readIf = (p) => (existsSync(p) ? readFileSync(p, "utf8").trim() : null);

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  readIf(join(supabaseDir, ".temp", "project-ref"));
const token =
  process.env.SUPABASE_ACCESS_TOKEN ||
  readIf(join(homedir(), ".supabase", "access-token"));

const die = (m) => { console.error("\n" + m + "\n"); process.exit(1); };
if (!ref) die("No project ref. Run `npx supabase link` or set SUPABASE_PROJECT_REF.");
if (!token) die("No access token. Create one at\nhttps://supabase.com/dashboard/account/tokens and set SUPABASE_ACCESS_TOKEN.");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
const text = await res.text();
if (!res.ok) die(`GET ${res.status} ${res.statusText}\n${text}`);
const c = JSON.parse(text);

const mask = (s) => (s ? String(s).slice(0, 4) + "…" + String(s).slice(-4) : "(unset)");
const show = (s) => (s === undefined || s === null || s === "" ? "(unset)" : s);
const row = (k, v) => console.log(`  ${k.padEnd(34)} ${v}`);

console.log(`\nAuth config for project ${ref}\n`);

console.log("EMAIL / SMTP");
row("external_email_enabled", show(c.external_email_enabled));
row("smtp_host", show(c.smtp_host));
row("smtp_port", show(c.smtp_port));
row("smtp_user", show(c.smtp_user));
row("smtp_pass", mask(c.smtp_pass));
row("smtp_admin_email (sender)", show(c.smtp_admin_email));
row("smtp_sender_name", show(c.smtp_sender_name));
row("smtp_max_frequency (s)", show(c.smtp_max_frequency));
row("mailer_otp_length", show(c.mailer_otp_length));
row("mailer_otp_exp (s)", show(c.mailer_otp_exp));
row("rate_limit_email_sent / hr", show(c.rate_limit_email_sent));
if (!c.external_email_enabled || !c.smtp_host) {
  console.log("  ⚠  No custom SMTP -> auth emails will NOT send (default mailer is org-only).");
}
if (c.smtp_admin_email === "onboarding@resend.dev") {
  console.log("  ⚠  Sender is onboarding@resend.dev -> Resend only delivers to your own");
  console.log("     Resend account address. Other recipients get nothing. Use a verified domain.");
}

console.log("\nAPPLE");
row("external_apple_enabled", show(c.external_apple_enabled));
row("external_apple_client_id", show(c.external_apple_client_id));
row("external_apple_additional_client_ids", show(c.external_apple_additional_client_ids));
row("external_apple_secret", mask(c.external_apple_secret));
if (!c.external_apple_enabled) {
  console.log("  ⚠  Apple provider disabled -> signInWithIdToken({provider:'apple'}) fails.");
}
const appleIds = `${c.external_apple_client_id || ""},${c.external_apple_additional_client_ids || ""}`;
if (c.external_apple_enabled && !appleIds.includes("com.pic.dojeon")) {
  console.log("  ⚠  Bundle id com.pic.dojeon not in the allowed client ids -> native token");
  console.log("     'aud' claim will be rejected. Add it to additional client ids.");
}

console.log("\nPHONE / SMS");
row("external_phone_enabled", show(c.external_phone_enabled));
row("sms_provider", show(c.sms_provider));
row("sms_twilio_account_sid", mask(c.sms_twilio_account_sid));
row("sms_twilio_auth_token", mask(c.sms_twilio_auth_token));
row("sms_twilio_message_service_sid", show(c.sms_twilio_message_service_sid));
row("sms_otp_length", show(c.sms_otp_length));
row("sms_otp_exp (s)", show(c.sms_otp_exp));
row("sms_max_frequency (s)", show(c.sms_max_frequency));
row("sms_template", show(c.sms_template));
row("rate_limit_sms_sent / hr", show(c.rate_limit_sms_sent));
if (!c.external_phone_enabled) {
  console.log("  ⚠  Phone provider disabled -> signInWithOtp({phone}) fails.");
}

console.log();
