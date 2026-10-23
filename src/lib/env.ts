/** True when Supabase public credentials are present. Auth/data features degrade honestly without them. */
export const supabaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
