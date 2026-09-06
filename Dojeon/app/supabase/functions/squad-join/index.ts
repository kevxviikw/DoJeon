// Push -- POST { inviteCode }. Joins an existing squad by its invite code,
// refusing once the squad is full or disbanded. Leaving is always
// available with no explanation needed (Field Manual §01) -- that's just
// `delete from squad_members where user_id = auth.uid()`, covered by RLS,
// so there's no dedicated leave function.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SquadJoinRequestBody {
  inviteCode: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SquadJoinRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: squad, error: squadError } = await supabase
      .from("squads")
      .select("id, size_max, status")
      .eq("invite_code", body.inviteCode.toUpperCase())
      .single();
    if (squadError || !squad) return errorResponse("Invalid invite code.", 404);
    if (squad.status !== "active") return errorResponse("This squad has already disbanded.", 410);

    const { count, error: countError } = await supabase
      .from("squad_members")
      .select("user_id", { count: "exact", head: true })
      .eq("squad_id", squad.id)
      .is("removed_at", null);
    if (countError) return errorResponse(countError.message, 500);
    if ((count ?? 0) >= squad.size_max) return errorResponse("This squad is already full.", 409);

    const { error: joinError } = await supabase.from("squad_members").insert({ squad_id: squad.id, user_id: userId });
    if (joinError) return errorResponse(joinError.message, 500);

    return jsonResponse({ squadId: squad.id }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
