// Supabase browser client.
//
// CourtOps is effectively a client-rendered SPA: every screen is a Client
// Component that reads the Zustand store, and Supabase Realtime runs in the
// browser. So a single browser client (with the public anon key) drives reads,
// writes, realtime, and auth. The secret service_role key never ships here; it
// only lives in scripts/seed.ts, which runs on your machine.
//
// Both env vars are NEXT_PUBLIC_ so they get inlined into the client bundle.
// They are safe to expose: the anon key is gated by row level security.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in dev rather than getting cryptic 401s at runtime.
  throw new Error(
    "Missing Supabase env vars. Copy .env.local.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
