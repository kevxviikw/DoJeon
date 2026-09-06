// Push, step 3 -- POST { sessionRoundId, missionId, taskId?, taskTitle,
// outputDescription, liveVisible? }. A squad member joins an in-progress
// round with their OWN task (no video call, no shared timer) -- this
// starts their own session row inside that round, gated on at least one
// host session in the round still being active. Field Manual §01.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { canJoinLiveSession, startSession } from "../_shared/logic/push.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SessionJoinRequestBody {
  sessionRoundId: string;
  missionId: string;
  taskId?: string | null;
  taskTitle: string;
  outputDescription: string;
  liveVisible?: boolean;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SessionJoinRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: hostSessions, error: hostError } = await supabase
      .from("sessions")
      .select("status")
      .eq("session_round_id", body.sessionRoundId)
      .eq("status", "active")
      .limit(1);
    if (hostError) return errorResponse(hostError.message, 500);

    const canJoin = canJoinLiveSession({
      hostSessionStatus: hostSessions.length > 0 ? "active" : "idle",
      liveVisibilityOptIn: body.liveVisible ?? false,
    });
    if (!canJoin) {
      return errorResponse(
        "Nothing to join right now -- this round has no active session, or you didn't opt into live visibility.",
        409
      );
    }

    const state = startSession(body.taskTitle, body.outputDescription);
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        mission_id: body.missionId,
        user_id: userId,
        task_id: body.taskId ?? null,
        session_round_id: body.sessionRoundId,
        task_title: state.taskTitle,
        output_description: state.outputDescription,
        status: state.status,
        live_visible: true, // they just explicitly opted in above
        started_at: state.startedAt!.toISOString(),
      })
      .select()
      .single();
    if (sessionError) return errorResponse(sessionError.message, 500);

    return jsonResponse({ session }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
