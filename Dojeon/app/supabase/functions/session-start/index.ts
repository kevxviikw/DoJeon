// Push, step 1-2 -- POST { missionId, taskId?, taskTitle, outputDescription,
// squadId?, liveVisible? }. Choose today's task/output, start the timer.
// If squadId is given, joins (or starts) that squad's current session
// round so the summary can group concurrent sessions together.

import { toCamelRow } from "../_shared/camelCase.ts";
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { startSession } from "../_shared/logic/push.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SessionStartRequestBody {
  missionId: string;
  taskId?: string | null;
  taskTitle: string;
  outputDescription: string;
  squadId?: string | null;
  liveVisible?: boolean;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SessionStartRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    // Validates the task title client-side before touching the DB.
    const state = startSession(body.taskTitle, body.outputDescription);

    let sessionRoundId: string | null = null;
    if (body.squadId) {
      const { data: openRound } = await supabase
        .from("session_rounds")
        .select("id")
        .eq("squad_id", body.squadId)
        .gte("started_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRound) {
        sessionRoundId = openRound.id;
      } else {
        const { data: newRound, error: roundError } = await supabase
          .from("session_rounds")
          .insert({ squad_id: body.squadId })
          .select("id")
          .single();
        if (roundError) return errorResponse(roundError.message, 500);
        sessionRoundId = newRound.id;
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        mission_id: body.missionId,
        user_id: userId,
        task_id: body.taskId ?? null,
        session_round_id: sessionRoundId,
        task_title: state.taskTitle,
        output_description: state.outputDescription,
        status: state.status,
        live_visible: body.liveVisible ?? false, // opt-in, never a default
        started_at: state.startedAt!.toISOString(),
      })
      .select()
      .single();
    if (sessionError) return errorResponse(sessionError.message, 500);

    return jsonResponse({ session: toCamelRow(session) }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
