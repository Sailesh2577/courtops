import { create } from "zustand";
import {
  makeInitial,
  type CourtOpsState,
  type Effect,
  type Match,
  type Court,
  type Block,
  type Toast,
} from "./data";

// The single source of truth for the whole tournament. Every screen reads from
// here, and resolving a flag mutates matches/courts/blocks so the board, the
// schedule, and the player view all update off the same state. This is the
// in-memory store for Phase 1. In Phase 2 the data source swaps to Supabase
// (Realtime + RLS) and the screens stay the same.

type ResolveOpts = { sent?: boolean; method?: "manual" | "auto" };

type CourtOpsStore = CourtOpsState & {
  tick: () => void;
  resolveFlag: (id: string, opts?: ResolveOpts) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  openCount: () => number;
  delayActive: () => boolean;
};

let toastSeq = 0;
const nextToastId = () => `t${++toastSeq}`;

// Apply a flag's effect to matches/courts/blocks, returning the changed slices.
function applyEffect(
  state: CourtOpsState,
  effect: Effect
): { matches: Record<string, Match>; courts: Court[]; blocks: Block[] } {
  const matches = { ...state.matches };
  let courts = state.courts;
  let blocks = state.blocks;

  if (effect.kind === "assign_court") {
    matches[effect.matchId] = {
      ...matches[effect.matchId],
      court: effect.courtId,
      status: "live",
      elapsedSec: 0,
      serving: "a",
    };
    courts = courts.map((c) =>
      c.id === effect.courtId
        ? { ...c, status: "live", matchId: effect.matchId, attention: false, note: undefined }
        : c
    );
  } else if (effect.kind === "shift_schedule") {
    blocks = blocks.map((b) => {
      if (effect.blockIds.includes(b.id)) {
        const nb = { ...b };
        if (b.id === effect.moveBlockId && effect.toCourt) nb.court = effect.toCourt;
        return nb;
      }
      return b;
    });
  } else if (effect.kind === "move_block") {
    blocks = blocks.map((b) =>
      b.id === effect.blockId ? { ...b, slot: effect.toSlot, highlight: false } : b
    );
  }

  return { matches, courts, blocks };
}

export const useStore = create<CourtOpsStore>((set, get) => ({
  ...makeInitial(),

  // advance elapsed timers for every live match (called once a second)
  tick: () =>
    set((s) => {
      const matches: Record<string, Match> = {};
      for (const k in s.matches) {
        const m = s.matches[k];
        matches[k] = m.status === "live" ? { ...m, elapsedSec: m.elapsedSec + 1 } : m;
      }
      return { matches };
    }),

  // resolve a flag: apply its effect, mark it handled, and announce it
  resolveFlag: (id, opts = {}) =>
    set((s) => {
      const flag = s.flags.find((f) => f.id === id);
      if (!flag || flag.resolved) return {};
      const { matches, courts, blocks } = applyEffect(s, flag.effect);
      const flags = s.flags.map((f) =>
        f.id === id
          ? { ...f, resolved: true, method: opts.method ?? "manual", sent: opts.sent }
          : f
      );
      const toast: Toast = {
        id: nextToastId(),
        title: opts.sent ? "Message sent · flag cleared" : "Flag cleared",
        body: flag.suggestion + ".",
      };
      return { matches, courts, blocks, flags, toasts: [...s.toasts, toast] };
    }),

  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: nextToastId() }] })),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  openCount: () => get().flags.filter((f) => !f.resolved).length,
  delayActive: () => !get().flags.find((f) => f.id === "f2")?.resolved,
}));
