-- CourtOps schema (Phase 2)
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- It is safe to re-run: every table is dropped and recreated.
--
-- Design notes:
--   * This mirrors the types in lib/data.ts. The TS field `where` becomes
--     `where_text` here because `where` is a SQL keyword.
--   * Demo-shaped values (a match's games, a flag's effect/message, a player's
--     schedule) are stored as jsonb so the app keeps one source of truth.
--   * The per-second timer tick is NOT stored. Each device ticks locally for
--     smooth timers; the database only holds state that changes on an action
--     (assign court, resolve flag). That keeps the demo numbers stable and
--     avoids a write every second.
--   * `activity` is an append-only log. The Phase 3 delay radar and the
--     end-of-day debrief both read from it.

-- ── reset ──────────────────────────────────────────────────────────────────
drop table if exists activity cascade;
drop table if exists blocks cascade;
drop table if exists flags cascade;
drop table if exists courts cascade;
drop table if exists matches cascade;
drop table if exists players cascade;
drop table if exists events cascade;

-- ── events ─────────────────────────────────────────────────────────────────
create table events (
  id                 text primary key,
  name               text not null,
  day                text not null,
  court_count        int  not null,
  schedule_generated boolean not null default true,
  est_idle_before    int,
  est_idle_after     int,
  now_min            int  not null
);

-- ── matches ────────────────────────────────────────────────────────────────
create table matches (
  id            text primary key,
  cat           text not null,            -- MS | WS | MD | WD | XD
  round         text not null,
  court         text,                      -- court id, or null when unassigned
  status        text not null,            -- live | ready | warming | done
  side_a        text[] not null,
  side_b        text[] not null,
  elapsed_sec   int  not null default 0,  -- value at last action; ticked locally
  plan_min      int  not null,
  games         jsonb not null default '[]'::jsonb,   -- [[a,b], ...]
  serving       text,                      -- a | b | null
  overrun       int,
  starts_in_min int,
  plan_start_min int
);

-- ── courts ─────────────────────────────────────────────────────────────────
create table courts (
  id        text primary key,
  name      text not null,
  status    text not null,                -- live | idle | warming | ...
  match_id  text,
  attention boolean not null default false,
  note      text,
  sort      int  not null default 0       -- stable board order
);

-- ── flags (the ranked decision feed) ─────────────────────────────────────────
create table flags (
  id         text primary key,
  type       text not null,
  severity   text not null,               -- high | medium | low
  icon       text not null,
  title      text not null,
  where_text text not null,               -- maps to TS `where`
  summary    text not null,
  reason     text not null,
  suggestion text not null,
  effect     jsonb not null,              -- discriminated union, see lib/data.ts
  message    jsonb not null,              -- { to, channel, body, note }
  resolved   boolean not null default false,
  method     text,                         -- manual | auto
  sent       boolean,
  sort       int  not null default 0       -- ranked order
);

-- ── schedule blocks (builder grid) ───────────────────────────────────────────
create table blocks (
  id        text primary key,
  court     text not null,
  slot      int  not null,
  cat       text not null,
  round     text not null,
  a         text not null,
  b         text not null,
  state     text not null,                -- done | live | ready | planned
  highlight boolean not null default false
);

-- ── players (phone "my next match" subjects) ─────────────────────────────────
create table players (
  id       text primary key,
  name     text not null,
  seed     int,
  club     text,
  match_id text,
  schedule jsonb not null default '[]'::jsonb
);

-- ── activity log (append-only; feeds the radar + debrief) ─────────────────────
create table activity (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  kind     text not null,                 -- flag_resolved | court_assigned | ...
  flag_id  text,
  match_id text,
  court_id text,
  method   text,                          -- manual | auto
  actor    text,                          -- organizer name / user id
  detail   jsonb
);

-- ── realtime ─────────────────────────────────────────────────────────────────
-- Broadcast row changes to subscribed clients so two devices stay in sync.
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table courts;
alter publication supabase_realtime add table flags;
alter publication supabase_realtime add table blocks;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table events;

-- ── row level security ───────────────────────────────────────────────────────
-- Demo policy set: anyone (anon player or signed-in organizer) may read the
-- live tournament; only a signed-in organizer may change it. The player phone
-- view is read-only, so this cleanly separates the two surfaces at the data
-- layer, not just in the UI.
alter table events   enable row level security;
alter table matches  enable row level security;
alter table courts   enable row level security;
alter table flags    enable row level security;
alter table blocks   enable row level security;
alter table players  enable row level security;
alter table activity enable row level security;

-- read: everyone
create policy "read events"   on events   for select using (true);
create policy "read matches"  on matches  for select using (true);
create policy "read courts"   on courts   for select using (true);
create policy "read flags"    on flags    for select using (true);
create policy "read blocks"   on blocks   for select using (true);
create policy "read players"  on players  for select using (true);
create policy "read activity" on activity for select using (true);

-- write: signed-in users only (organizers). Players use anonymous sessions,
-- which still count as authenticated in Supabase, so for a stricter demo this
-- can later check a role claim. Kept simple for now.
create policy "write events"   on events   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "write matches"  on matches  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "write courts"   on courts   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "write flags"    on flags    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "write blocks"   on blocks   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "write players"  on players  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "write activity" on activity for insert with check (auth.role() = 'authenticated');
