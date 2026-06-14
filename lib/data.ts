// data.ts — CourtOps mock tournament + types.
// One source of truth shared by every screen. Resolving a flag mutates the
// matches/courts/blocks here, and the board, schedule, and player view all
// re-render off the same state. Ported from the design handoff's data.jsx and
// personalized to the Nebraska Open with 9 courts.

import type { IconName } from "@/components/Icon";
import type { StatusKey } from "@/components/ui";

// ── helpers ──────────────────────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, "0");

// minutes-since-midnight -> "2:18 PM"
export function clock(min: number): string {
  let h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ap}`;
}

// minutes-since-midnight -> "2:18" (no meridiem)
export function clockShort(min: number): string {
  let h = Math.floor(min / 60) % 24;
  const m = min % 60;
  h = h % 12 || 12;
  return `${h}:${pad2(m)}`;
}

// seconds -> "51:12"
export function mmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${pad2(Math.floor(sec % 60))}`;
}

// ── category metadata ─────────────────────────────────────────────────────────
export type CatKey = "MS" | "WS" | "MD" | "WD" | "XD";

export const CATS: Record<CatKey, { long: string; short: string }> = {
  MS: { long: "Men's Singles", short: "MS" },
  WS: { long: "Women's Singles", short: "WS" },
  MD: { long: "Men's Doubles", short: "MD" },
  WD: { long: "Women's Doubles", short: "WD" },
  XD: { long: "Mixed Doubles", short: "XD" },
};

// ── matches ──────────────────────────────────────────────────────────────────
export type MatchStatus = "live" | "ready" | "warming" | "done";

export type Match = {
  id: string;
  cat: CatKey;
  round: string;
  court: string | null;
  status: MatchStatus;
  a: string[];
  b: string[];
  elapsedSec: number;
  planMin: number;
  games: [number, number][];
  serving: "a" | "b" | null;
  overrun?: number;
  startsInMin?: number;
  planStartMin?: number;
};

function mkMatches(): Record<string, Match> {
  return {
    m1: {
      id: "m1", cat: "MS", round: "Semifinal", court: "C1", status: "live",
      a: ["Wei Chen"], b: ["Noah Park"], elapsedSec: 51 * 60 + 12, planMin: 35,
      games: [[21, 18], [19, 21], [14, 11]], serving: "a", overrun: 16,
    },
    m2: {
      id: "m2", cat: "WD", round: "Quarterfinal", court: "C2", status: "live",
      a: ["Maya Lin", "Sofia Marin"], b: ["Hana Yamamoto", "Nina Kovac"],
      elapsedSec: 13 * 60 + 40, planMin: 30, games: [[15, 11]], serving: "b",
    },
    m4: {
      id: "m4", cat: "XD", round: "Quarterfinal", court: "C4", status: "live",
      a: ["Omar Haddad", "Zoe Bennett"], b: ["Diego Torres", "Leah Cohen"],
      elapsedSec: 22 * 60 + 5, planMin: 30, games: [[21, 17], [8, 6]], serving: "a",
    },
    // Aanya's match — the one the idle-court flag resolves onto Court 3
    mAanya: {
      id: "mAanya", cat: "WS", round: "Quarterfinal", court: null, status: "ready",
      a: ["Aanya Rao"], b: ["Priya Nair"], elapsedSec: 0, planMin: 30,
      games: [], serving: null, planStartMin: 14 * 60 + 30,
    },
    m6: {
      id: "m6", cat: "MD", round: "Quarterfinal", court: "C5", status: "ready",
      a: ["Arjun Patel", "Tomas Novak"], b: ["Liam O'Brien", "Kabir Singh"],
      elapsedSec: 0, planMin: 35, games: [], serving: null,
    },
    m7: {
      id: "m7", cat: "WS", round: "Quarterfinal", court: "C6", status: "warming",
      a: ["Mira Kapoor"], b: ["Hana Sato"], elapsedSec: 0, planMin: 30,
      games: [], serving: null, startsInMin: 4,
    },
    m5: {
      id: "m5", cat: "MD", round: "Quarterfinal", court: "C5", status: "done",
      a: ["Jin Park", "Carlos Diaz"], b: ["Sam Reed", "Eli Stone"],
      elapsedSec: 26 * 60, planMin: 30, games: [[21, 14], [21, 18]], serving: null,
    },
    // C7 / C8 — extra live matches so the 9-court board reads as a busy day
    m8: {
      id: "m8", cat: "MS", round: "Quarterfinal", court: "C7", status: "live",
      a: ["Lucas Meyer"], b: ["Ravi Anand"], elapsedSec: 18 * 60 + 30, planMin: 30,
      games: [[21, 16], [7, 9]], serving: "b",
    },
    m9: {
      id: "m9", cat: "WD", round: "Quarterfinal", court: "C8", status: "live",
      a: ["Ivy Park", "Mei Wong"], b: ["Clara Fox", "Tara Shah"], elapsedSec: 9 * 60 + 5,
      planMin: 30, games: [[11, 8]], serving: "a",
    },
  };
}

// ── courts ───────────────────────────────────────────────────────────────────
export type Court = {
  id: string;
  name: string;
  status: StatusKey;
  matchId: string | null;
  attention: boolean;
  note?: string;
};

function mkCourts(): Court[] {
  return [
    { id: "C1", name: "Court 1", status: "live", matchId: "m1", attention: false },
    { id: "C2", name: "Court 2", status: "live", matchId: "m2", attention: false },
    { id: "C3", name: "Court 3", status: "idle", matchId: null, attention: true, note: "Match ready · idle 6 min" },
    { id: "C4", name: "Court 4", status: "live", matchId: "m4", attention: false },
    { id: "C5", name: "Court 5", status: "idle", matchId: null, attention: true, note: "Just finished · idle 7 min" },
    { id: "C6", name: "Court 6", status: "warming", matchId: "m7", attention: false, note: "Warm-up · starts ~4 min" },
    { id: "C7", name: "Court 7", status: "live", matchId: "m8", attention: false },
    { id: "C8", name: "Court 8", status: "live", matchId: "m9", attention: false },
    { id: "C9", name: "Court 9", status: "idle", matchId: null, attention: false },
  ];
}

// ── flags (the decision feed, ranked by severity) ────────────────────────────
export type Severity = "high" | "medium" | "low";

export type Effect =
  | { kind: "assign_court"; matchId: string; courtId: string }
  | { kind: "shift_schedule"; deltaMin: number; blockIds: string[]; moveBlockId: string; toCourt: string }
  | { kind: "move_block"; blockId: string; toSlot: number }
  | { kind: "nudge" };

export type FlagMessage = { to: string; channel: string; body: string; note: string };

export type Flag = {
  id: string;
  type: string;
  severity: Severity;
  icon: IconName;
  title: string;
  where: string;
  summary: string;
  reason: string;
  suggestion: string;
  effect: Effect;
  message: FlagMessage;
  resolved: boolean;
  method?: "manual" | "auto";
  sent?: boolean;
};

function mkFlags(): Flag[] {
  return [
    {
      id: "f1", type: "idle_court", severity: "high", icon: "court",
      title: "Court 3 is open and a match is ready",
      where: "Court 3 · Women's Singles QF",
      summary: "Aanya Rao vs Priya Nair are checked in and warm. Court 3 has sat empty 6 minutes.",
      reason: "An idle court with a ready match is the most expensive kind of wait. Both players and a court are stalled at once.",
      suggestion: "Send this match to Court 3 now",
      effect: { kind: "assign_court", matchId: "mAanya", courtId: "C3" },
      message: {
        to: "Aanya Rao, Priya Nair", channel: "SMS",
        body: "You're up next on Court 3. Head over now, your Women's Singles quarterfinal is about to start. Good luck! — Nebraska Open",
        note: "Tone matched to your other player messages.",
      },
      resolved: false,
    },
    {
      id: "f2", type: "running_behind", severity: "high", icon: "clock",
      title: "Court 1 is running 16 min behind",
      where: "Court 1 · Men's Singles SF",
      summary: "Chen vs Park went to a third game. Two later matches on Courts 1 and 4 are now at risk.",
      reason: "Left alone, the delay cascades into four downstream matches and pushes the finals past schedule.",
      suggestion: "Shift the next 2 matches +15 min, move one to Court 6",
      effect: { kind: "shift_schedule", deltaMin: 15, blockIds: ["b8", "b9"], moveBlockId: "b9", toCourt: "C6" },
      message: {
        to: "4 affected players", channel: "SMS",
        body: "Quick heads-up: your match is pushed about 15 minutes. New estimated start is 3:15 PM. We'll text again when your court is ready, no need to check in yet. — Nebraska Open",
        note: "Sent to everyone in the affected matches.",
      },
      resolved: false,
    },
    {
      id: "f3", type: "back_to_back", severity: "medium", icon: "player",
      title: "Rohan Mehta has two matches back-to-back",
      where: "Men's Singles QF to Men's Doubles QF",
      summary: "Rohan finishes his singles at 3:00 and is scheduled to start doubles at 3:00 with zero rest.",
      reason: "Below the 10-minute minimum rest. He'll either forfeit tempo or hold up the next court.",
      suggestion: "Push his doubles by one slot (about 8 min rest)",
      effect: { kind: "move_block", blockId: "bRohan2", toSlot: 4 },
      message: {
        to: "Rohan Mehta", channel: "SMS",
        body: "Heads-up Rohan, we moved your doubles to 3:30 PM so you get a breather after singles. Same court. — Nebraska Open",
        note: "Personalised for a single player.",
      },
      resolved: false,
    },
    {
      id: "f4", type: "slow_turnover", severity: "medium", icon: "refresh",
      title: "Court 5 turnover is slow",
      where: "Court 5 · Men's Doubles QF",
      summary: "The previous match finished 7 minutes ago. Patel/Novak and O'Brien/Singh are ready but not called.",
      reason: "Turnover gaps are quiet court-time you never get back.",
      suggestion: "Call both pairs to Court 5",
      effect: { kind: "assign_court", matchId: "m6", courtId: "C5" },
      message: {
        to: "4 doubles players", channel: "SMS",
        body: "Court 5 is open, please head over now for your Men's Doubles quarterfinal. — Nebraska Open",
        note: "Group message to both pairs.",
      },
      resolved: false,
    },
    {
      id: "f5", type: "player_nudge", severity: "low", icon: "bell",
      title: "Mixed SF players not checked in",
      where: "Mixed Doubles SF · about 20 min out",
      summary: "Two of the four players for the 2:40 Mixed SF haven't checked in yet.",
      reason: "A gentle nudge now avoids a scramble when the court frees up.",
      suggestion: "Send a warm-up nudge",
      effect: { kind: "nudge" },
      message: {
        to: "2 players", channel: "Push",
        body: "Your Mixed Doubles semifinal is about 20 minutes out. Time to check in and start warming up, we'll let you know your court soon. — Nebraska Open",
        note: "Light-touch reminder.",
      },
      resolved: false,
    },
  ];
}

// ── schedule blocks (builder grid) ───────────────────────────────────────────
// court column + slot row. slots are 30 min apart starting 1:30 PM.
export const SLOTS = ["1:30", "2:00", "2:30", "3:00", "3:30", "4:00"];
export const SLOT_START = 13 * 60 + 30;

export type BlockState = "done" | "live" | "ready" | "planned";

export type Block = {
  id: string;
  court: string;
  slot: number;
  cat: CatKey;
  round: string;
  a: string;
  b: string;
  state: BlockState;
  highlight?: boolean;
};

function mkBlocks(): Block[] {
  return [
    { id: "b1", court: "C1", slot: 0, cat: "MS", round: "QF", a: "W. Chen", b: "A. Kumar", state: "done" },
    { id: "b2", court: "C2", slot: 0, cat: "WD", round: "QF", a: "Lin / Marin", b: "Yamamoto / Kovac", state: "done" },
    { id: "b3", court: "C4", slot: 0, cat: "XD", round: "QF", a: "Haddad / Bennett", b: "Torres / Cohen", state: "done" },
    { id: "b4", court: "C1", slot: 1, cat: "MS", round: "SF", a: "W. Chen", b: "N. Park", state: "live" },
    { id: "b5", court: "C2", slot: 1, cat: "WD", round: "QF", a: "Lin / Marin", b: "Yamamoto / Kovac", state: "live" },
    { id: "b6", court: "C4", slot: 1, cat: "XD", round: "QF", a: "Haddad / Bennett", b: "Torres / Cohen", state: "live" },
    { id: "bAanya", court: "C3", slot: 1, cat: "WS", round: "QF", a: "A. Rao", b: "P. Nair", state: "ready" },
    { id: "b7", court: "C5", slot: 1, cat: "MD", round: "QF", a: "Patel / Novak", b: "O'Brien / Singh", state: "ready" },
    { id: "bRohan1", court: "C2", slot: 2, cat: "MS", round: "QF", a: "R. Mehta", b: "D. Shah", state: "planned", highlight: true },
    { id: "b8", court: "C1", slot: 2, cat: "MS", round: "Final", a: "TBD", b: "TBD", state: "planned" },
    { id: "b9", court: "C4", slot: 2, cat: "XD", round: "SF", a: "TBD", b: "TBD", state: "planned" },
    { id: "bRohan2", court: "C2", slot: 3, cat: "MD", round: "QF", a: "Mehta / Roy", b: "Das / Iyer", state: "planned", highlight: true },
    { id: "b10", court: "C5", slot: 3, cat: "WS", round: "SF", a: "TBD", b: "TBD", state: "planned" },
    { id: "b11", court: "C3", slot: 3, cat: "XD", round: "Final", a: "TBD", b: "TBD", state: "planned" },
  ];
}

// ── player (the phone "my next match" user) ──────────────────────────────────
export type PlayerScheduleItem = {
  id: string;
  cat: CatKey;
  round: string;
  result?: string;
  when?: string;
  state: "done" | "next" | "upcoming";
  note?: string;
};

export const PLAYER: {
  name: string;
  seed: number;
  club: string;
  matchId: string;
  schedule: PlayerScheduleItem[];
} = {
  name: "Aanya Rao", seed: 3, club: "Lincoln Racquet Club",
  matchId: "mAanya",
  schedule: [
    { id: "sd1", cat: "WS", round: "Round of 16", result: "Won 21-13, 21-16", when: "12:40 PM", state: "done" },
    { id: "mAanya", cat: "WS", round: "Quarterfinal", state: "next" },
    { id: "sd3", cat: "WS", round: "Semifinal", when: "~4:00 PM", state: "upcoming", note: "If you win" },
  ],
};

// ── event metadata ────────────────────────────────────────────────────────────
export const EVENT = { name: "Nebraska Open", day: "Saturday", courts: 9 };

// ── toasts ─────────────────────────────────────────────────────────────────────
export type Toast = { id: string; title: string; body?: string };

// ── initial state ────────────────────────────────────────────────────────────
export type CourtOpsState = {
  nowMin: number;
  matches: Record<string, Match>;
  courts: Court[];
  flags: Flag[];
  blocks: Block[];
  scheduleGenerated: boolean;
  estIdle: { before: number; after: number };
  toasts: Toast[];
};

export function makeInitial(): CourtOpsState {
  return {
    nowMin: 14 * 60 + 18, // 2:18 PM
    matches: mkMatches(),
    courts: mkCourts(),
    flags: mkFlags(),
    blocks: mkBlocks(),
    scheduleGenerated: true,
    estIdle: { before: 92, after: 54 },
    toasts: [],
  };
}
