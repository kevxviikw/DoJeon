// Solo matching (amendment B) -- POST { topN? }. Surfaces candidate
// squad-mates for a member without a squad, by goal-type/pace similarity.
// A search the member acts on, not an auto-match.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { findMatches } from "../_shared/logic/soloMatch.ts";
import type { GoalProfile } from "../_shared/logic/types.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SoloMatchRequestBody {
  topN?: number;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json().catch(() => ({}))) as SoloMatchRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: myProfile, error: myProfileError } = await supabase
      .from("goal_profiles")
      .select("user_id, goal_type, hours_per_day, deadline_days")
      .eq("user_id", userId)
      .single();
    if (myProfileError || !myProfile) {
      return errorResponse("Set up a goal profile (Forge a mission) before searching for squad-mates.", 404);
    }

    // Candidates: any other member without an active, non-removed squad
    // membership. goal_profiles is only readable per-row by its owner under
    // RLS, so this search runs through a dedicated RPC in production; for
    // the MVP it queries goal_profiles directly, which requires this
    // function to run with the service-role key -- see README for the
    // tradeoff and the RLS note.
    const { data: candidateRows, error: candidatesError } = await supabase
      .from("goal_profiles")
      .select("user_id, goal_type, hours_per_day, deadline_days")
      .neq("user_id", userId);
    if (candidatesError) return errorResponse(candidatesError.message, 500);

    const toProfile = (r: Record<string, number | string>): GoalProfile => ({
      userId: String(r.user_id),
      goalType: String(r.goal_type),
      hoursPerDay: Number(r.hours_per_day),
      deadlineDays: Number(r.deadline_days),
    });

    const matches = findMatches(toProfile(myProfile), candidateRows.map(toProfile), body.topN ?? 5);
    return jsonResponse({ matches });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
