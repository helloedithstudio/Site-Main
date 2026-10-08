// Server-only Supabase client.
//
// Uses SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_SUPABASE_*) so it bypasses Row Level Security
// and is safe to call from API routes and Server Components.
//
// NEVER import this file from client components or any path that could be bundled for the browser.
// The service role key must not be exposed to the client.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Use a plain `any`-typed client to avoid fighting the Supabase generic constraints when no
// database type definition is generated. Callers cast query results to their own types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

let _client: AnyClient | null = null;

export function getSupabaseServerClient(): AnyClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Supabase server client: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set. " +
        "Never use NEXT_PUBLIC_ keys for server-side access.",
    );
  }

  _client = createClient(url, key, {
    auth: {
      // Service role clients do not need session management.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return _client;
}
