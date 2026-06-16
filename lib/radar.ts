// radar.ts — the predictive delay radar's math, as a pure function over the
// store state. Given the live matches and the planned schedule blocks, it works
// out which courts are running behind plan and what they push downstream, so the
// organizer can act before a single late match cascades into the finals.
//
// This is read-only and derivable: it never mutates the store. The RadarView
// renders it; the fix (when there is one) reuses the existing resolveFlag path.

import {
  CATS,
  SLOT_START,
  type CourtOpsState,
  type Severity,
} from "./data";

// How long a court needs between matches before the next pair can start, and
// how we estimate the tail left on a match that is already past its plan.
const TURNOVER_MIN = 6;
const SLOT_LEN_MIN = 30;

// A planned match queued behind an over-running court, with when it was meant to
// start versus when it now realistically can.
export type RadarImpact = {
  blockId: string;
  court: string;
  label: string; // "MS Final"
  pairing: string; // "TBD vs TBD" or real names
  plannedStartMin: number;
  projectedStartMin: number;
  pushMin: number; // how much later than planned (0 = still on time)
};

// One live match that is over plan, plus the cascade it threatens.
export type RadarItem = {
  matchId: string;
  court: string; // court id, e.g. "C1"
  courtName: string; // "Court 1"
  title: string; // "Men's Singles SF"
  pairing: string; // "Wei Chen vs Noah Park"
  planMin: number;
  elapsedMin: number;
  overMin: number; // minutes past plan (always > 0 for ranked items)
  projectedFinishMin: number;
  projectedFreeMin: number; // finish + turnover
  severity: Severity;
  downstream: RadarImpact[];
  atRiskCount: number; // downstream blocks pushed past their planned start
  flagId?: string; // a matching unresolved "running behind" flag, if any
};

// A live match that is on or under plan (the calm contrast in the feed).
export type RadarOnTrack = {
  matchId: string;
  court: string;
  courtName: string;
  title: string;
  pairing: string;
  remainingMin: number; // estimated minutes left on plan
  projectedFinishMin: number;
};

export type Radar = {
  items: RadarItem[]; // over plan, ranked worst-first
  onTrack: RadarOnTrack[]; // live but on/under plan
  overCount: number;
  maxOverMin: number;
  atRiskCount: number; // total downstream blocks at risk across all courts
};

function severityFor(over: number): Severity {
  if (over >= 12) return "high";
  if (over >= 5) return "medium";
  return "low";
}

// A match past plan is still going; estimate its tail from how far over it is
// (a deep overrun usually means a long third game). One that is under plan just
// has its remaining planned minutes left.
function estRemainingMin(over: number, planMin: number, elapsedMin: number): number {
  if (over > 0) return Math.max(4, Math.round(over * 0.5));
  return Math.max(0, planMin - elapsedMin);
}

const titleFor = (cat: keyof typeof CATS, round: string) => `${CATS[cat].short} ${round}`;

type RadarInput = Pick<
  CourtOpsState,
  "matches" | "courts" | "blocks" | "flags" | "nowMin"
>;

export function computeRadar(state: RadarInput): Radar {
  const { matches, courts, blocks, flags, nowMin } = state;
  const courtName = (id: string) => courts.find((c) => c.id === id)?.name ?? id;

  const items: RadarItem[] = [];
  const onTrack: RadarOnTrack[] = [];

  for (const m of Object.values(matches)) {
    if (m.status !== "live" || !m.court) continue;
    const elapsedMin = Math.round(m.elapsedSec / 60);
    const overMin = Math.max(0, elapsedMin - m.planMin);
    const remaining = estRemainingMin(overMin, m.planMin, elapsedMin);
    const projectedFinishMin = nowMin + remaining;
    const pairing = `${m.a.join(" / ")} vs ${m.b.join(" / ")}`;
    const title = titleFor(m.cat, m.round);

    if (overMin === 0) {
      onTrack.push({
        matchId: m.id,
        court: m.court,
        courtName: courtName(m.court),
        title,
        pairing,
        remainingMin: remaining,
        projectedFinishMin,
      });
      continue;
    }

    // Walk the planned matches queued on this court and push each one to the
    // later of its planned start or when the court realistically frees up.
    const projectedFreeMin = projectedFinishMin + TURNOVER_MIN;
    let freeAt = projectedFreeMin;
    const upcoming = blocks
      .filter((b) => b.court === m.court && (b.state === "ready" || b.state === "planned"))
      .sort((a, b) => a.slot - b.slot);

    const downstream: RadarImpact[] = upcoming.map((b) => {
      const plannedStartMin = SLOT_START + b.slot * SLOT_LEN_MIN;
      const projectedStartMin = Math.max(plannedStartMin, freeAt);
      const pushMin = projectedStartMin - plannedStartMin;
      freeAt = projectedStartMin + SLOT_LEN_MIN + TURNOVER_MIN;
      return {
        blockId: b.id,
        court: b.court,
        label: titleFor(b.cat, b.round),
        pairing: `${b.a} vs ${b.b}`,
        plannedStartMin,
        projectedStartMin,
        pushMin,
      };
    });

    // Link a still-open "running behind" flag for this court, so the radar can
    // offer the same fix the decision feed already knows about.
    const flag = flags.find(
      (f) => !f.resolved && f.type === "running_behind" && f.where.includes(courtName(m.court!)),
    );

    items.push({
      matchId: m.id,
      court: m.court,
      courtName: courtName(m.court),
      title,
      pairing,
      planMin: m.planMin,
      elapsedMin,
      overMin,
      projectedFinishMin,
      projectedFreeMin,
      severity: severityFor(overMin),
      downstream,
      atRiskCount: downstream.filter((d) => d.pushMin > 0).length,
      flagId: flag?.id,
    });
  }

  items.sort((a, b) => b.overMin - a.overMin);
  onTrack.sort((a, b) => a.projectedFinishMin - b.projectedFinishMin);

  return {
    items,
    onTrack,
    overCount: items.length,
    maxOverMin: items.reduce((mx, it) => Math.max(mx, it.overMin), 0),
    atRiskCount: items.reduce((n, it) => n + it.atRiskCount, 0),
  };
}
