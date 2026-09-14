// Push -- POST { inviteCode }. Joins an existing squad by its invite code,
// refusing once the squad is full or disbanded. Leaving is always
// available with no explanation needed (Field Manual §01) -- that's just
// `delete from squad_members where user_id = auth.uid()`, covered by RLS,
// so there's no dedicated leave function.
//
// Runs with the service-role key: the `squads` SELECT policy is
// members-only (0001), so a not-yet-member can't look their target squad
// up by invite code under RLS. Identity still comes from the caller's JWT
// (currentUserId); the only row written is their own membership.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { currentUserId, supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface SquadJoinRequestBody {
  inviteCode: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SquadJoinRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAdmin();

    const code = (body.inviteCode ?? "").trim().toUpperCase();
    if (code.length === 0) return errorResponse("Enter an invite code.", 422);

    const { data: squad, error: squadError } = await supabase
      .from("squads")
      .select("id, size_max, status")
      .eq("invite_code", code)
      .single();
    if (squadError || !squad) return errorResponse("Invalid invite code.", 404);
    if (squad.status !== "active") return errorResponse("This squad has already disbanded.", 410);

    // One active squad per member (see squad-create for why).
    const { data: existing, error: existingError } = await supabase
      .from("squad_members")
      .select("squad_id")
      .eq("user_id", userId)
      .is("removed_at", null)
      .maybeSingle();
    if (existingError) return errorResponse(existingError.message, 500);
    if (existing) {
      return existing.squad_id === squad.id
        ? jsonResponse({ squadId: squad.id }, 200)
        : errorResponse("You're already in a squad. Leave it first.", 409);
    }

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
