import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE ROLE key (bypasses RLS so the
// admin can insert events). NEVER import this into a client component — the
// service-role key must never reach the browser.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}
