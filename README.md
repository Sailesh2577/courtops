# CourtOps

**The day-of operations tool that tournament-draw software forgets.**

Bracket apps tell you who plays whom. They go quiet the moment the tournament
actually starts. CourtOps runs the part that breaks down on the day: which court
is free, who plays next, what is running behind, and who to message about it. It
is built for one person standing courtside with a clipboard and a hundred small
decisions per hour.

Live demo: **https://courtops-mu.vercel.app/needs-you**
(open it on a laptop, then open `/player` on your phone to see both surfaces
share one live state).

---

## The problem

A badminton tournament with 9 courts and 60-plus matches does not run on the
draw. It runs on the organizer. A match goes 16 minutes long, so the next pair
has nowhere to play, so the court behind it backs up, so a player who showed up
on time is now standing around with no idea where to go. The draw software has
no opinion about any of this. The organizer holds it all in their head and
patches it by walking the floor, texting players, and rewriting the schedule on
paper.

That person does not need a better bracket. They need to **operate by
exception**: see only the things that need a decision right now, be handed a
sensible fix, and have one tap update everything and everyone at once.

## Who it's for

The tournament organizer, the director, the person whose phone does not stop.
The design holds two surfaces against one shared state:

- **Organizer dashboard** (desktop): the command center. What needs you, the
  court floor plan, the delay radar, the schedule, and the rescheduler.
- **Player phone view** (mobile, no login): a single calm answer to "when and
  where do I play next?" that updates itself when the organizer acts.

## The thesis: operate by exception

The home screen is **Needs you**, not a dashboard of everything. It is a feed
ranked by the cost of waiting, and it leads with one number: **fixes per hour**.
That is the headline metric on purpose. The job is not to stare at a board. The
job is to clear exceptions fast, and the product makes the rate of that work
visible.

## The signature moment: one action, everything updates

Court 3 opens up. At the same time, Aanya is warmed up and ready with no court,
and a flag is sitting in the feed saying so. The organizer taps one fix.

In a single action: the floor plan puts Aanya on Court 3, the flag clears, the
fixes-per-hour ticks up, and **Aanya's phone updates by itself** to show Court 3
with a number that scales in. No refresh, no second message, no separate app to
keep in sync. One state, two surfaces, broadcast over Supabase Realtime.

That is the whole product in one interaction: the organizer makes one decision
and the floor, the schedule, and every affected player move together.

## AI suggests, a person decides

AI is a copilot here, never an autopilot. Two places lean on it, and **neither
one ever writes anything on its own**:

- **Operator copilot** (`Cmd/Ctrl-K`): type a plain-language request like
  "Court 5 is open, who goes on?" It posts a compact snapshot of the live state
  to a server-side model (Gemini), which returns a *typed, validated plan*:
  assign this court, move that block, resolve this flag, send this message. The
  plan is shown for approval. Nothing changes until the organizer clicks
  Approve, and approval runs through the exact same code path as resolving a
  flag by hand, so the player phone stays in sync.
- **Delay radar** (`/radar`): a pure function reads the live matches against the
  planned schedule and works out which courts are over plan, when each will
  realistically free up (finish plus a 6-minute turnover), and what each delay
  pushes downstream. The projections are deliberately honest, not dramatized. If
  a court's overrun has a known fix, the radar offers the same one-tap resolve
  the feed knows about.

The model proposes. The server validates every id against real state and refuses
to invent. The human decides. That separation is the point.

## Architecture

```
                 organizer (authenticated)         player (anon, read-only)
                          │                                  │
                  ┌───────┴────────┐                 ┌───────┴────────┐
                  │  React 19 SPA  │                 │  React 19 SPA  │
                  │  Zustand store │                 │  Zustand store │
                  └───────┬────────┘                 └───────┬────────┘
       optimistic local set + persist                        │ subscribe
                          │                                  │
                  ┌───────▼──────────────────────────────────▼───────┐
                  │              Supabase (Postgres)                  │
                  │   RLS: read open to all, writes require a session │
                  │   Realtime broadcasts every changed row           │
                  └───────────────────────────────────────────────────┘

  copilot request ──► /api/copilot (server only, holds the model key)
                       returns a typed plan; never writes to the DB
```

A few decisions worth calling out:

- **One store, two surfaces.** Both the dashboard and the phone are the same
  Zustand store hydrated from the same tables. Writes are optimistic locally for
  snappiness, then persisted, and Supabase Realtime fans the change out to every
  other device.
- **Role separation through RLS, not app code.** Reads are open so a player
  never logs in. Writes require an authenticated session, and there is exactly
  one of those: the organizer. "Authenticated" cleanly means "the person
  allowed to change the tournament."
- **A frozen clock for stable metrics.** The per-second tick advances live match
  timers but never the reference "now," so time-based numbers (fixes per hour,
  how far behind a court is) stay believable through a fast demo instead of
  exploding.
- **The AI path reuses the human path.** An approved copilot plan and a
  hand-resolved flag both flow through the same apply-and-persist code. There is
  no separate "AI did this" branch that could drift.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Styling | Plain CSS with a design-token set (CSS custom properties; light/dark via `data-theme`). Not Tailwind. |
| State | Zustand |
| Backend | Supabase (Postgres + Realtime + Auth + Row Level Security) |
| AI | Gemini, server-side only, proposes typed plans and never writes |
| Icons / type | lucide-react with a custom shuttle mark; Hanken Grotesk via `next/font` |
| Hosting | Vercel |

The design follows one system in two idioms: a **floor-plan map** for space (the
court board) and a strict **Swiss grid** for sequence (everything ranked, like
the decision feed and the radar).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

To run the live-sync and AI features locally you need a Supabase project and a
Gemini key. Copy `.env.local.example` to `.env.local` and fill it in, then:

```bash
npm run seed:org     # create the demo organizer account
npm run seed         # write the seed tournament into Supabase
```

The product spec lives in [`docs/CourtOps_PRD.docx`](docs/CourtOps_PRD.docx).

## Structure

```
app/
  needs-you/  board/  radar/  schedule/  reschedule/  player/  login/
  api/copilot/route.ts   # server-only: calls the model, returns a typed plan
components/               # one view per screen + AppShell, Sidebar, CommandBar
lib/
  store.ts               # the Zustand store: load, subscribe, persist
  data.ts                # types, helpers, and the seed tournament
  copilot.ts             # shared plan types, snapshot, validation
  radar.ts               # the delay radar's pure math
  supabaseClient.ts  supabaseRows.ts  auth.ts
supabase/schema.sql      # 7 tables, RLS policies, Realtime publication
```
