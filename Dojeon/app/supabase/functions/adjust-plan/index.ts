// Adjust -- POST { missionId }. Checks for recovery room first; only
// proposes real tradeoffs when the goal genuinely no longer fits, and only
// a member's approval (a separate call, see adjustment-decide below)
// actually changes the mission. Also checks the repeated-Minimum-only
// trigger against the mission's recent tier_hit history. Field Manual §01
// ("Adjust, the rules").

import { toCamelRow } from "../_shared/camelCase.ts";
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { detectRepeatedMinimumOnly, proposeAdjustment } from "../_shared/logic/adjust.ts";
import type { Tier } from "../_shared/logic/types.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface AdjustRequestBody {
  missionId: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as AdjustRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("id, user_id, deadline, hours_available_per_day, tiers")
      .eq("id", body.missionId)
      .single();
    if (missionError || !mission) return errorResponse("Mission not found.", 404);
    if (mission.user_id !== userId) return errorResponse("Not your mission.", 403);

    const { data: milestones, error: milestoneError } = await supabase
      .from("milestones")
      .select("tier, completed_at")
      .eq("mission_id", body.missionId);
    if (milestoneError) return errorResponse(milestoneError.message, 500);

    const remainingDays = Math.max(
      0,
      Math.ceil((new Date(mission.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    // Remaining work = the Target tier's total hours, scaled down by the
    // fraction of Target-tier milestones already completed. Adjust reasons
    // from the deliverable, not just attendance (Field Manual §01).
    const targetMilestones = milestones.filter((m: { tier: string }) => m.tier === "target");
    const completedTargetMilestones = targetMilestones.filter((m: { completed_at: string | null }) => m.completed_at);
    const fractionRemaining =
      targetMilestones.length > 0 ? 1 - completedTargetMilestones.length / targetMilestones.length : 1;
    const remainingWorkHours = (mission.tiers?.target?.hours ?? 0) * fractionRemaining;

    const proposal = proposeAdjustment({
      remainingWorkHours,
      remainingDays,
      hoursAvailablePerDay: Number(mission.hours_available_per_day),
    });

    const { data: recentCheckins, error: checkinsError } = await supabase
      .from("checkins")
      .select("tier_hit")
      .eq("mission_id", body.missionId)
      .order("checkin_date", { ascending: true })
      .limit(30);
    if (checkinsError) return errorResponse(checkinsError.message, 500);

    const tierHitHistory = recentCheckins
      .map((c: { tier_hit: string | null }) => c.tier_hit)
      .filter((t: string | null): t is Tier => t !== null) as Tier[];
    const repeatedMinimumOnly = detectRepeatedMinimumOnly(tierHitHistory);

    const { data: adjustment, error: adjustmentError } = await supabase
      .from("adjustments")
      .insert({
        mission_id: body.missionId,
        trigger: repeatedMinimumOnly ? "repeated_minimum" : "missed_session",
        recovery_room_found: proposal.recoveryRoomFound,
        tradeoffs: proposal.tradeoffs,
        requires_approval: proposal.requiresApproval,
        original_snapshot: { tiers: mission.tiers, deadline: mission.deadline },
        proposed_snapshot: null, // filled in by adjustment-decide once the member picks a tradeoff
      })
      .select()
      .single();
    if (adjustmentError) return errorResponse(adjustmentError.message, 500);

    return jsonResponse({ adjustment: toCamelRow(adjustment), proposal, repeatedMinimumOnly }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
