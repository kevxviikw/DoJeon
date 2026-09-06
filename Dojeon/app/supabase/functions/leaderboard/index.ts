// Squad-scoped leaderboard (amendment A) -- POST { squadId }. Reads
// through squad_member_stats (a security_invoker view, so RLS on the
// underlying tables still applies to the caller) and only ever ranks the
// one squad passed in. There is no cross-squad endpoint -- by design.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { computeSquadLeaderboard } from "../_shared/logic/leaderboard.ts";
import type { MemberStats } from "../_shared/logic/types.ts";
import { supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface LeaderboardRequestBody {
  squadId: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as LeaderboardRequestBody;
    const supabase = supabaseAsUser(req);

    const { data: rows, error } = await supabase
      .from("squad_member_stats")
      .select("user_id, confirmed_checkins, scheduled_checkins, milestones_completed, milestones_total")
      .eq("squad_id", body.squadId);
    if (error) return errorResponse(error.message, 500);

    const members: MemberStats[] = rows.map((r: Record<string, number | string>) => ({
      userId: String(r.user_id),
      confirmedCheckins: Number(r.confirmed_checkins),
      scheduledCheckins: Number(r.scheduled_checkins),
      milestonesCompleted: Number(r.milestones_completed),
      milestonesTotal: Number(r.milestones_total),
    }));

    return jsonResponse({ leaderboard: computeSquadLeaderboard(members) });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
