// Push -- POST { name, sizeMin?, sizeMax? }. Creates a squad and seats the
// creator as its first member. Invite-only by link/code, per Field Manual
// §03 MVP scope (auto-matching is an open decision, not built).
//
// Runs with the service-role key: `squads` has no INSERT policy and its
// SELECT policy is members-only (0001), so the creator -- not yet a member
// at insert time -- can neither write the row nor read it back under RLS.
// The caller's identity still comes from their JWT (currentUserId), and the
// only rows written are their own squad + membership. Same tradeoff the
// README flags for solo-match, applied here.

import { toCamelRow } from "../_shared/camelCase.ts";
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { currentUserId, supabaseAdmin } from "../_shared/supabaseAdmin.ts";

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
    const supabase = supabaseAdmin();

    const name = (body.name ?? "").trim();
    if (name.length < 2) return errorResponse("Give the squad a name.", 422);

    // One active squad per member -- the app assumes this (single-row
    // membership lookups), and silently orphaning a first squad by joining
    // a second is worse than a clear error.
    const { data: existing, error: existingError } = await supabase
      .from("squad_members")
      .select("squad_id")
      .eq("user_id", userId)
      .is("removed_at", null)
      .maybeSingle();
    if (existingError) return errorResponse(existingError.message, 500);
    // Members can't leave on their own anymore (2026-09-15 amendment) --
    // the only way out is the squad's leader deleting it (before it's
    // started) or the automatic missed-day removal sweep.
    if (existing) return errorResponse("You're already in a squad.", 409);

    const { data: squad, error: squadError } = await supabase
      .from("squads")
      .insert({
        name,
        invite_code: generateInviteCode(),
        size_min: body.sizeMin ?? 3,
        size_max: body.sizeMax ?? 6,
        created_by: userId,
      })
      .select()
      .single();
    if (squadError) return errorResponse(squadError.message, 500);

    const { error: memberError } = await supabase.from("squad_members").insert({ squad_id: squad.id, user_id: userId });
    if (memberError) return errorResponse(memberError.message, 500);

    return jsonResponse({ squad: toCamelRow(squad) }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
