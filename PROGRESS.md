# CourtOps — Project Progress

A living log of what this project is, the decisions we have made, and where we
are. Update this whenever something meaningful changes so a new chat can read it
and pick up quickly. CLAUDE.md points here.

Last updated: 2026-06-15 (Phase 2 done: organizer login + role separation)

## What CourtOps is

A live tournament-day operations tool for racquet-sport organizers, piloting on
badminton. It runs the day-of logistics that tournament-draw software ignores:
which court is free, who plays next, what is running behind, and who to message
about it. Two surfaces share one live state: an organizer dashboard and a player
phone view. Guiding principle: AI suggests, a person decides. Headline metric:
organizer fixes per hour.

## Why we are building it

Portfolio project to target a Product Manager role at Hudl (the "Director
Operating System" for sports org operations: scheduling, communications,
game-day readiness, AI workflows that let you operate by exception). CourtOps is
a focused demo of that exact problem space.

## Tech stack and key decisions

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript. Chosen over Vite
  (the design-handoff README suggested Vite, but we need server-side LLM keys, a
  scheduling engine, and Supabase, so Next.js wins). This also matches the
  user's proven Duo project stack.
- Plain CSS with the design-handoff token set (CSS custom properties; light/dark
  via `data-theme` on `<html>`). Not Tailwind. Tokens ported verbatim from the
  handoff.
- Zustand for state.
- lucide-react for icons, plus a custom shuttle mark.
- next/font for Hanken Grotesk (UI) and JetBrains Mono (timers/scores/stats).
- Supabase (Postgres + Realtime + Auth + RLS) planned for Phase 2+.
- Gemini for drafting player messages only, Phase 3+.
- Vercel for hosting.

## Personalization

- Event name is "Nebraska Open" (Nebraska ties to the Hudl Lincoln, NE office).
- Tournament has 9 courts.
- Organizer shown as "Sailesh P."

## The signature demo flow

Flag f1 "Court 3 is open" + match mAanya (ready, no court) + court C3 (idle).
Resolving f1 mutates all three plus the player phone view at once. This is the
moment that shows "one action, everything updates."

## Build phases

- Phase 0 — DONE: themed app shell, design tokens, fonts, sidebar with 5-route
  nav, working light/dark toggle, base primitives. Verified with build,
  typecheck, lint. (Vercel deploy is the last Phase 0 step.)
- Phase 1 — DONE: full prototype recreated on local state. The reducer store
  was ported to a Zustand store, seed data lives in lib/data.ts (extended to 9
  courts), and all 5 screens are real (Court board, Needs you, Player, Schedule,
  Reschedule). The signature Court 3 flow works: resolving flag f1 sends Aanya
  to Court 3 and the board plus the player phone update off the same store.
  Verified with build, typecheck, and lint.
- Phase 2 — DONE: Supabase wiring with real auth. The store loads the live
  tournament, subscribes to Realtime, and persists the rows a flag touches so
  the organizer board and the player phone sync across separate sessions.
  Verified end to end: resolving "Court 3 is open" pushes Aanya to Court 3 on
  the player phone in real time. Auth is now a real organizer login: the
  organizer signs in with email + password (single seeded demo account); the
  player phone never authenticates and reads as the anon role. RLS writes are
  gated to authenticated sessions, which now cleanly means "the organizer".
  Organizer surfaces are gated client-side (redirect to /login); /player and
  /login are public. Still optional: add the env vars to Vercel so the live
  site syncs (the 3 Supabase vars; the demo org vars are optional overrides).
- Phase 3+ — AI: operator copilot (natural-language command bar that proposes
  a plan a person approves) + predictive delay radar. Gemini, server-side only.
  Player message drafting folds into the copilot.

## Routes

`/` redirects to `/needs-you`. Screens: `/needs-you` (home), `/board`,
`/schedule`, `/reschedule`, `/player`. All five are now real and live off the
shared store.

## Where the code lives

- `lib/data.ts` — types, helpers (clock, mmss), and the seed tournament
  (matches, courts, flags, schedule blocks, the player, event metadata). One
  place to edit the demo state. The seed script writes exactly this into Supabase.
- `lib/store.ts` — the Zustand store. Holds the whole tournament. `init()` signs
  in, loads the live tables, hydrates the store, and subscribes to Realtime.
  `resolveFlag` updates locally for snappiness, then `persist()` writes the
  changed rows so Realtime broadcasts them. The per-second `tick` stays local
  and is never written, so there is no write storm and demo numbers stay stable.
- `lib/auth.ts` — auth config: the demo organizer credentials (DEMO_ORG, from
  NEXT_PUBLIC env with demo fallbacks) and the public-route list used by the
  AppShell gate.
- `app/login/page.tsx` — the organizer sign-in screen (email + password,
  pre-filled demo creds). Renders standalone, no sidebar.
- `scripts/seed-organizer.ts` — creates/resets the demo organizer auth account
  with the service-role key. Run with `npm run seed:org`.
- `lib/supabaseClient.ts` — the browser Supabase client (reads NEXT_PUBLIC env).
- `lib/supabaseRows.ts` — mappers between snake_case DB rows and the camelCase
  TS types. Column names live in exactly one place here.
- `supabase/schema.sql` — the 7 tables (events, matches, courts, flags, blocks,
  players, activity), RLS policies, and Realtime publication. Paste into the
  Supabase SQL editor. Safe to re-run (drops first).
- `scripts/seed.ts` — writes lib/data.ts into Supabase using the service-role
  key (bypasses RLS). Run with `npm run seed`.
- `components/{Board,Flags,Player,Schedule,Reschedule}View.tsx` — the five
  screens as client components. The route `page.tsx` files just render them.
- `components/AppShell.tsx` — owns the once-a-second tick interval, the theme,
  calls `init()` once on mount, and gates organizer routes (redirects signed-out
  visitors to /login; lets /player and /login through).
- `components/{ui,Icon,Sidebar,Toasts}.tsx` — shared primitives and chrome.

## Supabase / environment

- `.env.local` (gitignored) holds the real keys: NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. `.env.local.example`
  is the committed template.
- RLS: read is open to everyone (so the player phone reads without logging in);
  writes require an authenticated session. The organizer signs in with email +
  password (a single seeded demo account), so `authenticated` now cleanly means
  "the organizer". Players never authenticate. Anonymous sign-ins should be
  DISABLED in Supabase Authentication settings (the opposite of the earlier
  anonymous approach) so an anon visitor can never get a writable session. If
  the organizer is signed out, writes silently change 0 rows and the app
  surfaces a "Change didn't sync · sign in" toast.
- Auth account: create the demo organizer with `npm run seed:org` (uses the
  service-role key, admin API; idempotent, resets the password to lib/auth.ts
  DEMO_ORG). The login page (/login) pre-fills the demo credentials so the live
  link works in one click. Defaults: sailesh@courtops.demo / courtops-demo,
  overridable via NEXT_PUBLIC_DEMO_ORG_* env vars.
- For the live Vercel site to work, the 3 env vars must be added in Vercel
  Project Settings -> Environment Variables.

## Working conventions

- Write in plain, human-sounding sentences. No em dashes.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing
  Next.js code (this Next.js has breaking changes vs. training data).
- Do not commit unless asked.

## Status log

- 2026-06-14: Phase 0 scaffolded and verified. Personalized to Nebraska Open / 9
  courts. Set up PROGRESS.md.
- 2026-06-14: Deployed to Vercel and live at
  https://courtops-mu.vercel.app/needs-you. Phase 0 complete.
- 2026-06-14: Phase 1 complete. Ported the store and seed data, built all 5
  screens, wired the signature Court 3 flow, and extended the board to 9 courts.
  Removed the Phase 0 primitives gallery. Build, typecheck, and lint all clean.
- 2026-06-14: Phase 2 sync working. Added Supabase schema, browser client, row
  mappers, and a seed script; rewrote the store to load + subscribe + persist
  through Supabase. Confirmed the Court 3 flow syncs live from the organizer
  board to a separate player phone session. Decided the Phase 3 AI direction:
  operator copilot + delay radar.
- 2026-06-15: UI redesign to escape the "AI generated" look. Chose one system,
  two idioms: "Map for space, Grid for sequence." Unified to a single typeface
  (Hanken Grotesk, tabular figures; dropped JetBrains Mono). Board rebuilt as a
  Floor Plan venue map (`.fp-*`, BoardView.tsx) and approved. Needs You rebuilt
  in the Swiss/International grid (`.nf-*` replacing old `.fl-*`/`.msg-*`,
  FlagsView.tsx): stat-band masthead, numbered ranked index, hairline rules,
  hard-edged severity tags, spec-sheet detail pane that keeps the AI
  drafted-message flow. Green = action, red = severity, live stays blue. Build,
  typecheck, lint clean. Throwaway HTML mockups live in `prototypes/`
  (untracked).
- 2026-06-15: Redesign finished across all 5 screens. Schedule and Reschedule
  rebuilt in the same Swiss grid idiom as Needs You: both reuse the `.nf-band`
  stat-band masthead and shared hard-edged controls (`.sw-btn`, `.sw-btn-ghost`,
  `.sw-btn-soft`, `.sw-ai`). Schedule grid is square + hairline + tabular, with
  the Rohan conflict and its popover in red (urgency). Reschedule trigger is a
  red-left-rule strip with a tabular metric; plan rows are ruled; side cards are
  square. Player kept as the phone (calmer distillation of the system) and
  refined: court numeral 80px tabular green with a `courtPop` scale-in on
  arrival plus the existing card flash. Added the animation set: floor-plan
  court-assign flash, Needs You row stagger + handled pop, schedule regenerate
  restagger, reschedule apply cascade, player arrival pop. ViewHead/AIChip/
  Button/Severity in components/ui.tsx are now unused (every screen has bespoke
  chrome) and can be removed later. Build, typecheck, lint all clean.
- 2026-06-15: Redesign polish + cleanup. Fixed a dark-mode bug where button
  text was invisible: the global `button` rule never set `color`, so button
  labels (including the Needs You flag rows, which are buttons) fell back to the
  UA default ink and vanished on the dark canvas. Added `color: inherit` to the
  base button rule. Also bumped the low-severity tag text from `--ink-3` to
  `--ink-2` for legibility in dark. Removed the now-unused ViewHead, AIChip,
  Button, and Severity from components/ui.tsx (kept Avatar, Stat, Pill,
  StatusDot, STATUS, initials, StatusKey, which are still referenced). Build,
  typecheck, lint all clean.
- 2026-06-15: Phase 2 finished — real organizer login + role separation.
  Replaced anonymous sign-in with an email + password organizer account. init()
  no longer signs in anonymously; it restores any session and subscribes to
  auth changes. Added signIn/signOut to the store, a /login page (Swiss idiom,
  pre-filled demo creds), and a client-side route gate in AppShell (organizer
  surfaces redirect signed-out visitors to /login; /player and /login are
  public). Sidebar shows the real signed-in organizer and a sign-out control.
  New lib/auth.ts holds DEMO_ORG + the public-route list. scripts/seed-organizer
  .ts (npm run seed:org) creates/resets the demo account via the admin API.
  Updated schema.sql comments and .env.local.example; with real login,
  Anonymous sign-ins should now be DISABLED in Supabase. Players read as anon
  (unchanged); only the organizer can write. Build, typecheck, lint all clean.
