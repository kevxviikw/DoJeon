// Missed-day removal sweep -- intended as a scheduled (cron) Edge Function
// invocation, not a per-user request. Uses the service-role client
// because it legitimately scans across every squad. Solo missions have no
// squad_id and are never touched here.
//
// Club presentation amendment (2026-09-15): flat 5-missed-day threshold
// (removal.ts::checkFlatRemoval), not the amendment-C fraction
// (checkRemoval, still there and tested, just unused by this sweep for
// now -- easy to switch back). "Missed" means no checkin row at all for
// that calendar day, evaluated in America/New_York (_shared/estDate.ts).
// Planned rest, technical interruption, and unproven check-ins are all
// already-established non-misses (_shared/logic/history.ts) and are
// excluded automatically just by having a checkin row logged that day at
// all -- this sweep only ever looks for the total absence of one.
//
// This previously read member.missed_days but nothing anywhere ever
// incremented it -- squad_members.missed_days was permanently stuck at
// its default of 0, so no one was ever actually removed. This sweep now
// does the increment itself.
//
// Idempotent: each member's last_swept_date stops a second run on the
// same day from double-counting yesterday.

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { yesterdayInTimeZone } from "../_shared/estDate.ts";
import { checkFlatRemoval } from "../_shared/logic/removal.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (_req) => {
  const admin = supabaseAdmin();
  const yesterday = yesterdayInTimeZone();
  const removals: Array<{ squadId: string; userId: string; missedDays: number }> = [];

  const { data: squads, error: squadsError } = await admin.from("squads").select("id").eq("status", "active");
  if (squadsError) return jsonResponse({ error: squadsError.message }, 500);

  for (const squad of squads) {
    const { data: members, error: membersError } = await admin
      .from("squad_members")
      .select("user_id, missed_days, last_swept_date")
      .eq("squad_id", squad.id)
      .is("removed_at", null);
    if (membersError) continue;

    for (const member of members) {
      if (member.last_swept_date === yesterday) continue; // already counted this day

      const { data: mission } = await admin
        .from("missions")
        .select("id")
        .eq("squad_id", squad.id)
        .eq("user_id", member.user_id)
        .eq("status", "active")
        .maybeSingle();
      if (!mission) continue; // nothing to have missed if there's no active mission

      const { count: checkinCount } = await admin
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", mission.id)
        .eq("checkin_date", yesterday);

      const missedYesterday = (checkinCount ?? 0) === 0;
      const newMissedDays = missedYesterday ? member.missed_days + 1 : member.missed_days;
      const check = checkFlatRemoval(newMissedDays);

      const update: Record<string, unknown> = { missed_days: newMissedDays, last_swept_date: yesterday };
      if (check.shouldRemove) {
        update.removed_at = new Date().toISOString();
        update.removal_reason = `Missed ${check.missedDays} days (over the ${check.threshold}-day auto-removal threshold).`;
      }

      await admin.from("squad_members").update(update).eq("squad_id", squad.id).eq("user_id", member.user_id);
      if (check.shouldRemove) {
        removals.push({ squadId: squad.id, userId: member.user_id, missedDays: check.missedDays });
      }
    }
  }

  return jsonResponse({ evaluatedDate: yesterday, removals });
});
