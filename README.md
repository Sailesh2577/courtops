# CourtOps

A live tournament-day operations tool for racquet-sport organizers (piloting on
badminton). It runs the *day-of* logistics that tournament-draw software ignores:
which court is free, who plays next, what's running behind, and who to message
about it. Two surfaces share one live state — an **organizer dashboard** and a
**player phone view** — and the guiding principle is **AI suggests, a person
decides**.

> Organizers run the whole tournament from one screen, and every player knows
> when and where they play next without having to ask.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Plain CSS with the design-handoff token set (CSS custom properties; light/dark via `data-theme` on `<html>`) |
| State | Zustand |
| Icons | lucide-react (+ a custom shuttle mark) |
| Fonts | Hanken Grotesk + JetBrains Mono via `next/font` |
| Backend *(Phase 2+)* | Supabase (Postgres + Realtime + Auth + RLS) |
| AI *(Phase 3+)* | Gemini — drafting player messages only |
| Hosting | Vercel |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Project status — Phase 0 ✅

The themed app shell is in place: sidebar with the five-route nav, a working
light/dark toggle (light default), and the base component primitives. Screens are
placeholders pending Phase 1.

The product spec lives in [`docs/CourtOps_PRD.docx`](docs/CourtOps_PRD.docx).

## Structure

```
app/                 # routes: /needs-you /board /schedule /reschedule /player
  layout.tsx         # fonts, theme bootstrap, app shell
  globals.css        # design tokens + primitive styles (ported from the handoff)
components/          # Sidebar, AppShell, Toasts, Icon, ui primitives
lib/store.ts         # Zustand store (toasts now; full live store in Phase 1)
```
