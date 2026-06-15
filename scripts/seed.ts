// Seed the Supabase database from the single source of truth in lib/data.ts.
//
// Run with:  npm run seed
//
// This reuses makeInitial(), PLAYER, and EVENT so the database can never drift
// from the prototype. It uses the secret service_role key (server-side only)
// to bypass row level security while seeding, so it must run on your machine,
// never in the browser. Re-run any time to reset the demo to a clean state.

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

// Load .env.local the same way Next.js does.
loadEnvConfig(process.cwd());

import { makeInitial, PLAYER, EVENT } from "../lib/data";

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
  const state = makeInitial();

  // events
  const event = {
    id: "ev1",
    name: EVENT.name,
    day: EVENT.day,
    court_count: EVENT.courts,
    schedule_generated: state.scheduleGenerated,
    est_idle_before: state.estIdle.before,
    est_idle_after: state.estIdle.after,
    now_min: state.nowMin,
  };

  // matches
  const matches = Object.values(state.matches).map((m) => ({
    id: m.id,
    cat: m.cat,
    round: m.round,
    court: m.court,
    status: m.status,
    side_a: m.a,
    side_b: m.b,
    elapsed_sec: m.elapsedSec,
    plan_min: m.planMin,
    games: m.games,
    serving: m.serving,
    overrun: m.overrun ?? null,
    starts_in_min: m.startsInMin ?? null,
    plan_start_min: m.planStartMin ?? null,
  }));

  // courts (sort by seed order so the board stays a clean grid)
  const courts = state.courts.map((c, i) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    match_id: c.matchId,
    attention: c.attention,
    note: c.note ?? null,
    sort: i,
  }));

  // flags (sort by seed order = ranked order)
  const flags = state.flags.map((f, i) => ({
    id: f.id,
    type: f.type,
    severity: f.severity,
    icon: f.icon,
    title: f.title,
    where_text: f.where,
    summary: f.summary,
    reason: f.reason,
    suggestion: f.suggestion,
    effect: f.effect,
    message: f.message,
    resolved: f.resolved,
    method: f.method ?? null,
    sent: f.sent ?? null,
    sort: i,
  }));

  // blocks
  const blocks = state.blocks.map((b) => ({
    id: b.id,
    court: b.court,
    slot: b.slot,
    cat: b.cat,
    round: b.round,
    a: b.a,
    b: b.b,
    state: b.state,
    highlight: b.highlight ?? false,
  }));

  // players
  const players = [
    {
      id: "player-aanya",
      name: PLAYER.name,
      seed: PLAYER.seed,
      club: PLAYER.club,
      match_id: PLAYER.matchId,
      schedule: PLAYER.schedule,
    },
  ];

  const steps: [string, PromiseLike<{ error: unknown }>][] = [
    ["events", db.from("events").upsert(event)],
    ["matches", db.from("matches").upsert(matches)],
    ["courts", db.from("courts").upsert(courts)],
    ["flags", db.from("flags").upsert(flags)],
    ["blocks", db.from("blocks").upsert(blocks)],
    ["players", db.from("players").upsert(players)],
  ];

  for (const [name, p] of steps) {
    const { error } = await p;
    if (error) {
      console.error(`Failed seeding ${name}:`, error);
      process.exit(1);
    }
    console.log(`Seeded ${name}`);
  }

  console.log("\nDone. Database matches lib/data.ts.");
}

main();
