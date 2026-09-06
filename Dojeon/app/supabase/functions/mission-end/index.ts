// Mission end & data collection (amendment D) -- POST { missionId, consent, patternNotes? }.
// Marks the mission completed; only with consent does it collect and
// store achievement/consistency/pattern data. If every squad-mate's
// mission under the same squad has also ended, the squad disbands.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { collectMissionEndData, disbandSquad } from "../_shared/logic/missionEnd.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface MissionEndRequestBody {
  missionId: string;
  consent: boolean;
  patternNotes?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as MissionEndRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("id, user_id, squad_id")
      .eq("id", body.missionId)
      .single();
    if (missionError || !mission) return errorResponse("Mission not found.", 404);
    if (mission.user_id !== userId) return errorResponse("Not your mission.", 403);

    const { data: checkins, error: checkinsError } = await supabase
      .from("checkins")
      .select("status")
      .eq("mission_id", body.missionId);
    if (checkinsError) return errorResponse(checkinsError.message, 500);

    const { data: milestones, error: milestonesError } = await supabase
      .from("milestones")
      .select("completed_at")
      .eq("mission_id", body.missionId);
    if (milestonesError) return errorResponse(milestonesError.message, 500);

    const { error: completeError } = await supabase
      .from("missions")
      .update({ status: "completed" })
      .eq("id", body.missionId);
    if (completeError) return errorResponse(completeError.message, 500);

    const report = collectMissionEndData({
      consent: body.consent,
      confirmedCheckins: checkins.filter((c: { status: string }) => c.status === "confirmed").length,
      scheduledCheckins: checkins.length,
      milestonesCompleted: milestones.filter((m: { completed_at: string | null }) => m.completed_at).length,
      milestonesTotal: milestones.length,
      patternNotes: body.patternNotes,
    });

    if (report) {
      const { error: reportError } = await supabase.from("mission_end_reports").insert({
        mission_id: body.missionId,
        user_id: userId,
        consent: true,
        achievement_score: report.achievementScore,
        consistency_score: report.consistencyScore,
        pattern_data: report.patternData,
      });
      if (reportError) return errorResponse(reportError.message, 500);
    }

    let squadDisbanded = false;
    if (mission.squad_id) {
      const { data: activeSquadMissions, error: activeError } = await supabase
        .from("missions")
        .select("id")
        .eq("squad_id", mission.squad_id)
        .eq("status", "active");
      if (activeError) return errorResponse(activeError.message, 500);

      if (activeSquadMissions.length === 0) {
        const disband = disbandSquad();
        const { error: disbandError } = await supabase
          .from("squads")
          .update({ status: disband.squadStatus, disbanded_at: disband.disbandedAt.toISOString() })
          .eq("id", mission.squad_id);
        if (disbandError) return errorResponse(disbandError.message, 500);
        squadDisbanded = true;
      }
    }

    return jsonResponse({ collected: report !== null, report, squadDisbanded });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
