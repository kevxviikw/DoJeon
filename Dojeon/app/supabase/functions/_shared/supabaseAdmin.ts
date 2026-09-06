// Two Supabase clients per request, matching the key-proxy architecture in
// the Field Manual (§04): the Gemini key and the Supabase service-role
// key live only here, server-side -- never in the iOS app bundle.
//
//   * `supabaseAsUser` runs queries as the calling member (their JWT),
//     so Postgres RLS (see migrations/0001_init.sql) enforces every
//     privacy/visibility rule automatically.
//   * `supabaseAdmin` uses the service-role key and bypasses RLS -- only
//     for operations that are legitimately cross-user by design, such as
//     the squad-removal-sweep cron job or tallying approval votes from
//     every squad member at once.

// deno-lint-ignore no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "./env.ts";

export function supabaseAsUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header (expected the caller's Supabase JWT).");
  }
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
}

export function supabaseAdmin() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function currentUserId(req: Request): string {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Malformed auth token.");
  const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  if (!decoded.sub) throw new Error("Auth token has no subject claim.");
  return decoded.sub as string;
}
