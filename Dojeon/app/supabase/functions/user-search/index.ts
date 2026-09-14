// Member directory search -- POST { query }. Returns up to 20 profiles
// whose @username starts with the query, for the "find people" screen.
//
// Runs with the service-role key on purpose: profiles RLS only exposes the
// caller and their squad-mates (0001), and a directory search is
// deliberately broader than that. It stays a read of public-facing fields
// only -- id, username, display_name, and whether the person is already in
// a squad. Never email or anything private.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { currentUserId, supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface UserSearchRequestBody {
  query: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json().catch(() => ({}))) as UserSearchRequestBody;
    const me = currentUserId(req); // also asserts the caller is authenticated

    // Normalize: drop a leading "@", lowercase, strip LIKE metacharacters so
    // the input is always a literal prefix.
    const raw = (body.query ?? "").trim().toLowerCase().replace(/^@+/, "").replace(/[%_\\]/g, "");
    if (raw.length < 2) return jsonResponse({ users: [] });

    const supabase = supabaseAdmin();

    const { data: profs, error } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .not("username", "is", null)
      .ilike("username", `${raw}%`)
      .neq("id", me)
      .order("username")
      .limit(20);
    if (error) return errorResponse(error.message, 500);

    const ids = (profs ?? []).map((p: Record<string, string>) => p.id);
    let inSquad = new Set<string>();
    if (ids.length > 0) {
      const { data: mems, error: memError } = await supabase
        .from("squad_members")
        .select("user_id")
        .in("user_id", ids)
        .is("removed_at", null);
      if (memError) return errorResponse(memError.message, 500);
      inSquad = new Set((mems ?? []).map((m: Record<string, string>) => m.user_id));
    }

    const users = (profs ?? []).map((p: Record<string, string>) => ({
      userId: p.id,
      username: p.username,
      displayName: p.display_name,
      inSquad: inSquad.has(p.id),
    }));

    return jsonResponse({ users });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
