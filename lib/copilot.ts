// The operator copilot's shared contract.
//
// CourtOps' guiding principle is "AI suggests, a person decides." The copilot
// never changes the tournament. It reads a snapshot of the current state, and
// proposes a Plan: a short summary plus a list of concrete, typed steps that map
// one-to-one onto operations the store already knows how to apply. The organizer
// sees the plan and approves it; only then does anything change.
//
// This file is imported by BOTH the browser (command bar + store) and the server
// route (/api/copilot), so it must stay free of server-only or browser-only
// imports. Types and pure helpers only.

import type { CourtOpsState } from "./data";

// ── the plan the model returns ───────────────────────────────────────────────

// Each action carries a human-readable `label` so the approval card can show
// what the step does without the UI re-deriving it. The other fields map onto
// the store's existing Effect machinery (assign_court / move_block) plus the two
// copilot-only verbs (resolve_flag, send_message).
export type CopilotAction =
  | { kind: "assign_court"; label: string; matchId: string; courtId: string }
  | { kind: "move_block"; label: string; blockId: string; toSlot: number }
  | { kind: "resolve_flag"; label: string; flagId: string }
  | {
      kind: "send_message";
      label: string;
      to: string;
      channel: string;
      body: string;
    };

export type CopilotPlan = {
  summary: string; // one line: what approving this plan does
  steps: CopilotAction[];
  note?: string; // optional caveat or assumption the organizer should know
};

// ── the snapshot the browser sends to the model ──────────────────────────────
// A compact, id-bearing view of the live tournament. The model may only
// reference ids that appear here, and the server re-checks that after the call.

export type CopilotSnapshot = {
  nowMin: number;
  matches: {
    id: string;
    cat: string;
    round: string;
    players: string;
    court: string | null;
    status: string;
    planMin: number;
    elapsedMin: number;
    overMin: number; // minutes past plan for a live match, else 0
  }[];
  courts: {
    id: string;
    name: string;
    status: string;
    matchId: string | null;
    note?: string;
  }[];
  flags: {
    id: string;
    title: string;
    where: string;
    severity: string;
    suggestion: string;
    resolved: boolean;
  }[];
  blocks: {
    id: string;
    court: string;
    slot: number;
    cat: string;
    pairing: string;
    state: string;
  }[];
};

export function makeSnapshot(state: CourtOpsState): CopilotSnapshot {
  const matches = Object.values(state.matches).map((m) => {
    const elapsedMin = Math.round(m.elapsedSec / 60);
    const overMin =
      m.status === "live" ? Math.max(0, elapsedMin - m.planMin) : 0;
    return {
      id: m.id,
      cat: m.cat,
      round: m.round,
      players: `${m.a.join(" / ")} vs ${m.b.join(" / ")}`,
      court: m.court,
      status: m.status,
      planMin: m.planMin,
      elapsedMin,
      overMin,
    };
  });

  const courts = state.courts.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    matchId: c.matchId,
    note: c.note,
  }));

  const flags = state.flags.map((f) => ({
    id: f.id,
    title: f.title,
    where: f.where,
    severity: f.severity,
    suggestion: f.suggestion,
    resolved: f.resolved,
  }));

  const blocks = state.blocks.map((b) => ({
    id: b.id,
    court: b.court,
    slot: b.slot,
    cat: b.cat,
    pairing: `${b.a} vs ${b.b}`,
    state: b.state,
  }));

  return { nowMin: state.nowMin, matches, courts, flags, blocks };
}

// ── validation ───────────────────────────────────────────────────────────────
// The model is told to use only ids from the snapshot, but we never trust that.
// validatePlan drops any step that references an id we don't recognize and
// returns the surviving steps plus a list of problems for logging.

export function validatePlan(
  plan: CopilotPlan,
  snap: CopilotSnapshot,
): { plan: CopilotPlan; dropped: string[] } {
  const matchIds = new Set(snap.matches.map((m) => m.id));
  const courtIds = new Set(snap.courts.map((c) => c.id));
  const flagIds = new Set(snap.flags.map((f) => f.id));
  const blockIds = new Set(snap.blocks.map((b) => b.id));
  const dropped: string[] = [];

  const steps = plan.steps.filter((s) => {
    switch (s.kind) {
      case "assign_court":
        if (!matchIds.has(s.matchId) || !courtIds.has(s.courtId)) {
          dropped.push(`assign_court: unknown ${s.matchId}/${s.courtId}`);
          return false;
        }
        return true;
      case "move_block":
        if (!blockIds.has(s.blockId)) {
          dropped.push(`move_block: unknown ${s.blockId}`);
          return false;
        }
        return true;
      case "resolve_flag":
        if (!flagIds.has(s.flagId)) {
          dropped.push(`resolve_flag: unknown ${s.flagId}`);
          return false;
        }
        return true;
      case "send_message":
        if (!s.body?.trim() || !s.to?.trim()) {
          dropped.push("send_message: empty body or recipient");
          return false;
        }
        return true;
      default:
        return false;
    }
  });

  return { plan: { ...plan, steps }, dropped };
}
