// Push summary -- POST { squadId }. The async-friendly squad activity
// feed: leads with recently completed sessions, not just who's live right
// now. Field Manual §01 ("Push, in practice").

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { summarizeSquadActivity } from "../_shared/logic/push.ts";
import type { RawSquadSession } from "../_shared/logic/push.ts";
import { supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SquadActivityRequestBody {
  squadId: string;
  lookbackHours?: number;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SquadActivityRequestBody;
    const supabase = supabaseAsUser(req);
    const since = new Date(Date.now() - (body.lookbackHours ?? 48) * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from("sessions")
      .select("user_id, task_title, status, started_at, ended_at, live_visible, missions!inner(squad_id)")
      .eq("missions.squad_id", body.squadId)
      .gte("started_at", since);
    if (error) return errorResponse(error.message, 500);

    const sessions: RawSquadSession[] = rows.map((r: Record<string, unknown>) => ({
      userId: String(r.user_id),
      taskTitle: String(r.task_title),
      status: r.status as RawSquadSession["status"],
      startedAt: new Date(r.started_at as string),
      endedAt: r.ended_at ? new Date(r.ended_at as string) : null,
      liveVisible: Boolean(r.live_visible),
    }));

    return jsonResponse(summarizeSquadActivity(sessions));
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
