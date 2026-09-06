// Push -- POST { name, sizeMin?, sizeMax? }. Creates a squad and seats the
// creator as its first member. Invite-only by link/code, per Field Manual
// §03 MVP scope (auto-matching is an open decision, not built).

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface SquadCreateRequestBody {
  name: string;
  sizeMin?: number;
  sizeMax?: number;
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as SquadCreateRequestBody;
    const userId = currentUserId(req);
    const supabase = supabaseAsUser(req);

    const { data: squad, error: squadError } = await supabase
      .from("squads")
      .insert({
        name: body.name,
        invite_code: generateInviteCode(),
        size_min: body.sizeMin ?? 3,
        size_max: body.sizeMax ?? 6,
      })
      .select()
      .single();
    if (squadError) return errorResponse(squadError.message, 500);

    const { error: memberError } = await supabase.from("squad_members").insert({ squad_id: squad.id, user_id: userId });
    if (memberError) return errorResponse(memberError.message, 500);

    return jsonResponse({ squad }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
