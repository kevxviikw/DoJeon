// Postgres/PostgREST rows come back snake_case. mobile/lib/hooks.ts documents
// the convention this app runs on: "Edge Function responses -- unlike
// PostgREST rows -- we control and return camelCase". Most functions build
// their response by hand and already follow that; a few instead return a
// raw `.insert(...).select().single()` / `.update(...).select().single()`
// row straight through, which is still snake_case and silently breaks every
// camelCase field the client reads off it (e.g. `session.startedAt` reads
// as undefined because the wire key is `started_at`).
//
// Shallow on purpose: every nested jsonb payload in this app (missions.tiers,
// adjustments.*_snapshot, ...) is written by application code already in
// its target casing, never read back through this helper.
export function toCamelRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    out[camelKey] = value;
  }
  return out as T;
}
