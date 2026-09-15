// Proof -- POST { missionId, sessionId?, taskCompleted, evidenceSubmitted,
// plannedRest, technicalInterruption, tierHit?, fileUrl?, filePrivate? }
// Classifies the day's event (miss/unproven/rest/interrupted/completed),
// labels evidence honestly, and either auto-confirms (solo missions) or
// leaves the check-in pending for squad peer approval. See Field Manual
// §01/§02, and amendment C for peer approval.

import { toCamelRow } from "../_shared/camelCase.ts";
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { todayInTimeZone } from "../_shared/estDate.ts";
import { classifyEvent } from "../_shared/logic/history.ts";
import { submitEvidence } from "../_shared/logic/proof.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface CheckinRequestBody {
  missionId: string;
  sessionId?: string | null;
  taskCompleted: boolean;
  evidenceSubmitted: boolean;
  plannedRest?: boolean;
  technicalInterruption?: boolean;
  tierHit?: "minimum" | "target" | "stretch" | null;
  fileUrl?: string | null;
  filePrivate?: boolean;
  checkinDate?: string; // defaults to today in America/New_York if omitted
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as CheckinRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("id, user_id, squad_id")
      .eq("id", body.missionId)
      .single();
    if (missionError || !mission) return errorResponse("Mission not found.", 404);
    if (mission.user_id !== userId) return errorResponse("Not your mission.", 403);

    const record = {
      taskCompleted: body.taskCompleted,
      evidenceSubmitted: body.evidenceSubmitted,
      plannedRest: body.plannedRest ?? false,
      technicalInterruption: body.technicalInterruption ?? false,
    };
    const eventType = classifyEvent(record);
    const evidence = submitEvidence({
      fileUrl: body.fileUrl ?? null,
      filePrivate: body.filePrivate ?? true,
    });

    // Solo missions (no squad) are never peer-reviewed -- auto-confirmed.
    // Squad missions start pending until checkin-approve clears the
    // squad's approval threshold (amendment C).
    const status = mission.squad_id ? "pending" : "confirmed";

    const { data: checkin, error: checkinError } = await supabase
      .from("checkins")
      .insert({
        mission_id: body.missionId,
        user_id: userId,
        session_id: body.sessionId ?? null,
        checkin_date: body.checkinDate ?? todayInTimeZone(),
        task_completed: record.taskCompleted,
        evidence_submitted: record.evidenceSubmitted,
        planned_rest: record.plannedRest,
        technical_interruption: record.technicalInterruption,
        tier_hit: body.tierHit ?? null,
        event_type: eventType,
        evidence_trust_label: evidence.trustLabel,
        file_private: evidence.filePrivate,
        file_url: evidence.fileUrl,
        status,
      })
      .select()
      .single();
    if (checkinError) return errorResponse(checkinError.message, 500);

    return jsonResponse({ checkin: toCamelRow(checkin), eventType }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
