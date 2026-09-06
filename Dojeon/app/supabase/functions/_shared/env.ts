// Small env-var helper for Edge Functions (Deno.env). Fails loudly at
// request time rather than silently running with an empty secret.

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it with \`supabase secrets set ${name}=...\`.`);
  }
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  return Deno.env.get(name) ?? fallback;
}
