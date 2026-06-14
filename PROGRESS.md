# CourtOps — Project Progress

A living log of what this project is, the decisions we have made, and where we
are. Update this whenever something meaningful changes so a new chat can read it
and pick up quickly. CLAUDE.md points here.

Last updated: 2026-06-14

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
- Phase 1 — NEXT: recreate the full prototype on local state. Port the reducer
  store + seed data, build the 5 screens (Court board, Needs you, Player,
  Schedule, Reschedule), wire the signature Court 3 flow. This is the
  portfolio-ready, demoable checkpoint.
- Phase 2+ — Supabase wiring.
- Phase 3+ — Gemini message drafting.

## Routes

`/` redirects to `/needs-you`. Screens: `/needs-you` (home), `/board`,
`/schedule`, `/reschedule`, `/player`. All but the gallery on /needs-you are
placeholders until Phase 1.

## Working conventions

- Write in plain, human-sounding sentences. No em dashes.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing
  Next.js code (this Next.js has breaking changes vs. training data).
- Do not commit unless asked.

## Status log

- 2026-06-14: Phase 0 scaffolded and verified. Personalized to Nebraska Open / 9
  courts. Set up PROGRESS.md and Vercel deploy.
