// Create (or reset) the demo organizer login.
//
// Run with:  npm run seed:org
//
// CourtOps has one organizer account for the demo. This script creates it with
// the service_role key (admin API), so it must run on your machine, never in the
// browser. It is idempotent: run it again to reset the password to the value in
// lib/auth.ts (DEMO_ORG). Players never sign in, so there is nothing to seed for
// them; they read through row level security as the anon role.
//
// After running this, DISABLE "Anonymous sign-ins" in Supabase Authentication
// settings so the only way to get a writable session is this organizer account.

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

// Load .env.local the same way Next.js does. This must run before lib/auth is
// imported (it reads NEXT_PUBLIC_* at module load), so DEMO_ORG is pulled in
// with a dynamic import inside main() rather than a hoisted top-level import.
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { DEMO_ORG } = await import("../lib/auth");
  const { email, password, name } = DEMO_ORG;

  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip the confirmation email; this is a demo account
    user_metadata: { name },
  });

  if (!error) {
    console.log(`Created organizer ${email}.`);
    return;
  }

  // Already there? Reset the password so login keeps matching lib/auth.ts.
  const exists = /already|registered|exists/i.test(error.message);
  if (exists) {
    const { data: list, error: listErr } = await db.auth.admin.listUsers();
    if (listErr) {
      console.error("Could not list users:", listErr.message);
      process.exit(1);
    }
    const existing = list.users.find((u) => u.email === email);
    if (existing) {
      const { error: updErr } = await db.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { name },
      });
      if (updErr) {
        console.error("Could not reset password:", updErr.message);
        process.exit(1);
      }
      console.log(`Organizer ${email} already existed; password reset.`);
      return;
    }
  }

  console.error("Failed to create organizer:", error.message);
  process.exit(1);
}

main();
