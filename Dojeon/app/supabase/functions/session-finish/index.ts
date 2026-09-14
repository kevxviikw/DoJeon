// Push, step 4 -- POST { sessionId, outcome: "submit" | "blocker", blockerNote? }.
// Finish by submitting the output, or recording a blocker instead.

import { toCamelRow } from "../_shared/camelCase.ts";
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { InvalidSessionTransition, recordBlocker, submitOutput } from "../_shared/logic/push.ts";
import type { SessionState } from "../_shared/logic/push.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SessionFinishRequestBody {
  sessionId: string;
  outcome: "submit" | "blocker";
  blockerNote?: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SessionFinishRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: row, error: rowError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", body.sessionId)
      .single();
    if (rowError || !row) return errorResponse("Session not found.", 404);
    if (row.user_id !== userId) return errorResponse("Not your session.", 403);

    const state: SessionState = {
      status: row.status,
      taskTitle: row.task_title,
      outputDescription: row.output_description,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      blockerNote: row.blocker_note,
    };

    const finished = body.outcome === "submit" ? submitOutput(state) : recordBlocker(state, body.blockerNote ?? "");

    const { data: session, error: updateError } = await supabase
      .from("sessions")
      .update({ status: finished.status, ended_at: finished.endedAt!.toISOString(), blocker_note: finished.blockerNote })
      .eq("id", body.sessionId)
      .select()
      .single();
    if (updateError) return errorResponse(updateError.message, 500);

    return jsonResponse({ session: toCamelRow(session) });
  } catch (err) {
    if (err instanceof InvalidSessionTransition) return errorResponse(err.message, 409);
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
