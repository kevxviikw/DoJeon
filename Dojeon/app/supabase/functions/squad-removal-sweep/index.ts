// Missed-day removal sweep (amendment C) -- intended as a scheduled
// (cron) Edge Function invocation, not a per-user request. Uses the
// service-role client because it legitimately scans across every squad.
// Solo missions have no squad_id and are never touched here.

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { checkRemoval } from "../_shared/logic/removal.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (_req) => {
  const admin = supabaseAdmin();
  const removals: Array<{ squadId: string; userId: string; missedDays: number; missionDurationDays: number }> = [];

  const { data: squads, error: squadsError } = await admin
    .from("squads")
    .select("id, missed_day_removal_fraction")
    .eq("status", "active");
  if (squadsError) return jsonResponse({ error: squadsError.message }, 500);

  for (const squad of squads) {
    const { data: members, error: membersError } = await admin
      .from("squad_members")
      .select("user_id, missed_days")
      .eq("squad_id", squad.id)
      .is("removed_at", null);
    if (membersError) continue;

    for (const member of members) {
      const { data: mission } = await admin
        .from("missions")
        .select("duration_days")
        .eq("squad_id", squad.id)
        .eq("user_id", member.user_id)
        .eq("status", "active")
        .maybeSingle();
      if (!mission) continue;

      const check = checkRemoval(member.missed_days, mission.duration_days, Number(squad.missed_day_removal_fraction));
      if (check.shouldRemove) {
        await admin
          .from("squad_members")
          .update({
            removed_at: new Date().toISOString(),
            removal_reason: `Missed ${check.missedDays}/${check.missionDurationDays} days (over the squad's ${(
              Number(squad.missed_day_removal_fraction) * 100
            ).toFixed(0)}% threshold).`,
          })
          .eq("squad_id", squad.id)
          .eq("user_id", member.user_id);
        removals.push({
          squadId: squad.id,
          userId: member.user_id,
          missedDays: check.missedDays,
          missionDurationDays: check.missionDurationDays,
        });
      }
    }
  }

  return jsonResponse({ removals });
});
