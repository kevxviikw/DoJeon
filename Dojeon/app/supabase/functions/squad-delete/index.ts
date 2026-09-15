// Squad -- POST { squadId }. Club presentation amendment (2026-09-15):
// only the squad's leader (squads.created_by) can delete it, and only
// before anyone has actually started -- any session or checkin logged
// under one of the squad's missions blocks deletion permanently. Members
// can't leave on their own at all now (squad_members RLS, 0005); this and
// the automatic missed-day removal sweep are the only ways a membership
// row goes away.
//
// Runs with the service-role key: the "started" check reads across every
// member's missions/sessions/checkins, which is legitimately cross-user,
// same tradeoff as squad-create/squad-join.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { currentUserId, supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface SquadDeleteRequestBody {
  squadId: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SquadDeleteRequestBody;
    const userId = currentUserId(req);
    const admin = supabaseAdmin();

    const { data: squad, error: squadError } = await admin
      .from("squads")
      .select("id, created_by, status")
      .eq("id", body.squadId)
      .single();
    if (squadError || !squad) return errorResponse("Squad not found.", 404);
    if (squad.created_by !== userId) return errorResponse("Only the squad's leader can delete it.", 403);
    if (squad.status !== "active") return errorResponse("This squad has already disbanded.", 410);

    const { data: missions, error: missionsError } = await admin.from("missions").select("id").eq("squad_id", body.squadId);
    if (missionsError) return errorResponse(missionsError.message, 500);
    const missionIds = missions.map((m: { id: string }) => m.id);

    if (missionIds.length > 0) {
      const [{ count: sessionCount }, { count: checkinCount }] = await Promise.all([
        admin.from("sessions").select("id", { count: "exact", head: true }).in("mission_id", missionIds),
        admin.from("checkins").select("id", { count: "exact", head: true }).in("mission_id", missionIds),
      ]);
      if ((sessionCount ?? 0) > 0 || (checkinCount ?? 0) > 0) {
        return errorResponse(
          "This squad has already started -- members have logged sessions or check-ins, so it can no longer be deleted.",
          409
        );
      }
    }

    // missions.squad_id is ON DELETE SET NULL (0001) -- deleting the squad
    // detaches any forged-but-unstarted missions rather than destroying
    // them, and squad_members cascades away with the squad.
    const { error: deleteError } = await admin.from("squads").delete().eq("id", body.squadId);
    if (deleteError) return errorResponse(deleteError.message, 500);

    return jsonResponse({ deleted: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
