// Peer-approved check-ins -- POST { checkinId, approve } (amendment C).
// Records the caller's vote, then tallies every eligible squad member's
// vote against the squad's own approval threshold (default 75%,
// adjustable). Confirms once the threshold clears; rejects once every
// eligible voter has voted and it still hasn't. Uses the service-role
// client for the tally because it legitimately reads across squad
// members, not just the caller's own rows.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { tallyApproval } from "../_shared/logic/approval.ts";
import { markSquadReviewed } from "../_shared/logic/proof.ts";
import { currentUserId, supabaseAdmin, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface ApproveRequestBody {
  checkinId: string;
  approve: boolean;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as ApproveRequestBody;
    const voterId = currentUserId(req);

    // Vote as the calling user -- RLS (checkin_approvals insert policy)
    // already refuses a submitter voting on their own check-in.
    const asUser = supabaseAsUser(req);
    const { error: voteError } = await asUser
      .from("checkin_approvals")
      .upsert({ checkin_id: body.checkinId, approver_user_id: voterId, approved: body.approve });
    if (voteError) return errorResponse(voteError.message, 403);

    const admin = supabaseAdmin();
    const { data: checkin, error: checkinError } = await admin
      .from("checkins")
      .select("id, user_id, mission_id, status, missions!inner(squad_id)")
      .eq("id", body.checkinId)
      .single();
    if (checkinError || !checkin) return errorResponse("Check-in not found.", 404);

    const squadId = (checkin as unknown as { missions: { squad_id: string | null } }).missions.squad_id;
    if (!squadId) return errorResponse("Solo check-ins aren't peer-approved.", 400);

    const { data: squad, error: squadError } = await admin
      .from("squads")
      .select("check_approval_threshold")
      .eq("id", squadId)
      .single();
    if (squadError || !squad) return errorResponse("Squad not found.", 404);

    const { data: members, error: membersError } = await admin
      .from("squad_members")
      .select("user_id")
      .eq("squad_id", squadId)
      .is("removed_at", null);
    if (membersError) return errorResponse(membersError.message, 500);

    const eligibleVoters = members.filter((m: { user_id: string }) => m.user_id !== checkin.user_id);

    const { data: votes, error: votesError } = await admin
      .from("checkin_approvals")
      .select("approved")
      .eq("checkin_id", body.checkinId);
    if (votesError) return errorResponse(votesError.message, 500);

    const tally = tallyApproval(
      votes.map((v: { approved: boolean }) => v.approved),
      eligibleVoters.length,
      Number(squad.check_approval_threshold)
    );

    let newStatus = checkin.status;
    let evidenceTrustLabel: string | undefined;
    if (tally.confirmed) {
      newStatus = "confirmed";
      evidenceTrustLabel = markSquadReviewed({
        submitted: true,
        trustLabel: "attached",
        filePrivate: false,
        fileUrl: null,
        fileRemoved: false,
      }).trustLabel;
    } else if (tally.votesCast >= eligibleVoters.length) {
      // Every eligible voter has weighed in and the threshold still isn't met.
      newStatus = "rejected";
    }

    if (newStatus !== checkin.status) {
      const update: Record<string, unknown> = { status: newStatus };
      if (evidenceTrustLabel) update.evidence_trust_label = evidenceTrustLabel;
      const { error: updateError } = await admin.from("checkins").update(update).eq("id", body.checkinId);
      if (updateError) return errorResponse(updateError.message, 500);
    }

    return jsonResponse({ tally, status: newStatus });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
