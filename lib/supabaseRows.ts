// Mappers between Supabase rows (snake_case columns) and the app's TS types
// (camelCase, defined in lib/data.ts). Kept in one place so the column names
// live in exactly one spot. The seed script writes these same shapes.

import type {
  Match,
  Court,
  Flag,
  Block,
  CatKey,
  MatchStatus,
  Severity,
  Effect,
  FlagMessage,
  BlockState,
} from "./data";
import type { IconName } from "@/components/Icon";
import type { StatusKey } from "@/components/ui";

// ── matches ──────────────────────────────────────────────────────────────────
export type MatchRow = {
  id: string;
  cat: string;
  round: string;
  court: string | null;
  status: string;
  side_a: string[];
  side_b: string[];
  elapsed_sec: number;
  plan_min: number;
  games: [number, number][];
  serving: "a" | "b" | null;
  overrun: number | null;
  starts_in_min: number | null;
  plan_start_min: number | null;
};

export function rowToMatch(r: MatchRow): Match {
  return {
    id: r.id,
    cat: r.cat as CatKey,
    round: r.round,
    court: r.court,
    status: r.status as MatchStatus,
    a: r.side_a,
    b: r.side_b,
    elapsedSec: r.elapsed_sec,
    planMin: r.plan_min,
    games: r.games ?? [],
    serving: r.serving,
    overrun: r.overrun ?? undefined,
    startsInMin: r.starts_in_min ?? undefined,
    planStartMin: r.plan_start_min ?? undefined,
  };
}

export function matchToRow(m: Match): MatchRow {
  return {
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
  };
}

// ── courts ─────────────────────────────────────────────────────────────────
export type CourtRow = {
  id: string;
  name: string;
  status: string;
  match_id: string | null;
  attention: boolean;
  note: string | null;
  sort: number;
};

export function rowToCourt(r: CourtRow): Court {
  return {
    id: r.id,
    name: r.name,
    status: r.status as StatusKey,
    matchId: r.match_id,
    attention: r.attention,
    note: r.note ?? undefined,
  };
}

export function courtToRow(c: Court, sort: number): CourtRow {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    match_id: c.matchId,
    attention: c.attention,
    note: c.note ?? null,
    sort,
  };
}

// ── flags ──────────────────────────────────────────────────────────────────
export type FlagRow = {
  id: string;
  type: string;
  severity: string;
  icon: string;
  title: string;
  where_text: string;
  summary: string;
  reason: string;
  suggestion: string;
  effect: Effect;
  message: FlagMessage;
  resolved: boolean;
  method: string | null;
  sent: boolean | null;
  sort: number;
};

export function rowToFlag(r: FlagRow): Flag {
  return {
    id: r.id,
    type: r.type,
    severity: r.severity as Severity,
    icon: r.icon as IconName,
    title: r.title,
    where: r.where_text,
    summary: r.summary,
    reason: r.reason,
    suggestion: r.suggestion,
    effect: r.effect,
    message: r.message,
    resolved: r.resolved,
    method: (r.method as "manual" | "auto" | null) ?? undefined,
    sent: r.sent ?? undefined,
  };
}

export function flagToRow(f: Flag, sort: number): FlagRow {
  return {
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
    sort,
  };
}

// ── blocks ─────────────────────────────────────────────────────────────────
export type BlockRow = {
  id: string;
  court: string;
  slot: number;
  cat: string;
  round: string;
  a: string;
  b: string;
  state: string;
  highlight: boolean;
};

export function rowToBlock(r: BlockRow): Block {
  return {
    id: r.id,
    court: r.court,
    slot: r.slot,
    cat: r.cat as CatKey,
    round: r.round,
    a: r.a,
    b: r.b,
    state: r.state as BlockState,
    highlight: r.highlight,
  };
}

export function blockToRow(b: Block): BlockRow {
  return {
    id: b.id,
    court: b.court,
    slot: b.slot,
    cat: b.cat,
    round: b.round,
    a: b.a,
    b: b.b,
    state: b.state,
    highlight: b.highlight ?? false,
  };
}
