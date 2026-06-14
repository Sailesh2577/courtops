# CourtOps — Project Progress

A living log of what this project is, the decisions we have made, and where we
are. Update this whenever something meaningful changes so a new chat can read it
and pick up quickly. CLAUDE.md points here.

Last updated: 2026-06-14 (Phase 1 complete)

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
- Phase 2+ — NEXT: Supabase wiring. Swap the store's data source from the local
  seed to Supabase (Postgres + Realtime + RLS) so the organizer dashboard and
  the player phone sync across two real devices. Add Auth so organizers and
  players see different surfaces.
- Phase 3+ — Gemini message drafting, server-side only.

## Routes

`/` redirects to `/needs-you`. Screens: `/needs-you` (home), `/board`,
`/schedule`, `/reschedule`, `/player`. All five are now real and live off the
shared store.

## Where the code lives (Phase 1)

- `lib/data.ts` — types, helpers (clock, mmss), and the seed tournament
  (matches, courts, flags, schedule blocks, the player, event metadata). One
  place to edit the demo state.
- `lib/store.ts` — the Zustand store. Holds the whole tournament and exposes
  `tick`, `resolveFlag`, `pushToast`, `dismissToast`. Resolving a flag applies
  its effect to matches/courts/blocks so every screen updates at once. This is
  the seam Supabase plugs into in Phase 2.
- `components/{Board,Flags,Player,Schedule,Reschedule}View.tsx` — the five
  screens as client components. The route `page.tsx` files just render them.
- `components/AppShell.tsx` — owns the once-a-second tick interval and theme.
- `components/{ui,Icon,Sidebar,Toasts}.tsx` — shared primitives and chrome.

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
