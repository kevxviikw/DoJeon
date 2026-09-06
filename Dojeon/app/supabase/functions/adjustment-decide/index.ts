// Adjust, step 2 -- POST { adjustmentId, approved, revisedTiers?, revisedDeadline? }.
// The member's explicit approval is what's allowed to actually change a
// mission; either way both the original and the proposed revision stay on
// record (applyAdjustment never overwrites). Field Manual §01, rule 4-5.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { applyAdjustment } from "../_shared/logic/adjust.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface DecideRequestBody {
  adjustmentId: string;
  approved: boolean;
  revisedTiers?: unknown;
  revisedDeadline?: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as DecideRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: adjustment, error: adjustmentError } = await supabase
      .from("adjustments")
      .select("id, mission_id, original_snapshot, missions!inner(user_id)")
      .eq("id", body.adjustmentId)
      .single();
    if (adjustmentError || !adjustment) return errorResponse("Adjustment not found.", 404);
    if ((adjustment as unknown as { missions: { user_id: string } }).missions.user_id !== userId) {
      return errorResponse("Not your mission.", 403);
    }

    const proposedRevision = {
      tiers: body.revisedTiers ?? adjustment.original_snapshot.tiers,
      deadline: body.revisedDeadline ?? adjustment.original_snapshot.deadline,
    };
    const { activeMission, record } = applyAdjustment(adjustment.original_snapshot, proposedRevision, body.approved);

    const { error: updateAdjustmentError } = await supabase
      .from("adjustments")
      .update({
        approved: record.approved,
        proposed_snapshot: record.proposedRevision,
        decided_at: record.decidedAt.toISOString(),
      })
      .eq("id", body.adjustmentId);
    if (updateAdjustmentError) return errorResponse(updateAdjustmentError.message, 500);

    if (body.approved) {
      const { error: missionUpdateError } = await supabase
        .from("missions")
        .update({ tiers: activeMission.tiers, deadline: activeMission.deadline })
        .eq("id", adjustment.mission_id);
      if (missionUpdateError) return errorResponse(missionUpdateError.message, 500);
    }

    return jsonResponse({ activeMission, approved: body.approved });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
