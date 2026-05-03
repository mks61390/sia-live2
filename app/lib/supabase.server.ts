import { createClient } from "@supabase/supabase-js";

export function createSupabaseServer() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Uses the service role key — bypasses RLS. Never call from client-side code.
export function createSupabaseServiceServer() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321";
  const key = process.env.SUPABASE_SERVICE_KEY ?? "placeholder-service-key";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
