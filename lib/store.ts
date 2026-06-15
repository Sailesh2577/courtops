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
import { supabase } from "./supabaseClient";
import {
  rowToMatch,
  rowToCourt,
  rowToFlag,
  rowToBlock,
  matchToRow,
  courtToRow,
  blockToRow,
  type MatchRow,
  type CourtRow,
  type FlagRow,
  type BlockRow,
} from "./supabaseRows";

// The single source of truth for the whole tournament. Every screen reads from
// here. In Phase 2 the data lives in Supabase: init() signs in, loads the live
// tables, and subscribes to Realtime so a change made on one device shows up on
// another. Resolving a flag updates the store optimistically and writes the
// changed rows back, which Realtime then broadcasts to every other client.
//
// The per-second timer tick stays local and cosmetic: we never write it, so it
// never causes a write storm and the demo numbers stay stable across devices.

type ResolveOpts = { sent?: boolean; method?: "manual" | "auto" };

type CourtOpsStore = CourtOpsState & {
  ready: boolean; // true once the first load from Supabase has completed
  tick: () => void;
  init: () => Promise<void>;
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

// Which rows an effect touched, so we only write what changed. Returns the
// match ids, court ids, and block ids that applyEffect would have modified.
function touchedByEffect(effect: Effect): {
  matchIds: string[];
  courtIds: string[];
  blockIds: string[];
} {
  if (effect.kind === "assign_court") {
    return { matchIds: [effect.matchId], courtIds: [effect.courtId], blockIds: [] };
  }
  if (effect.kind === "shift_schedule") {
    return { matchIds: [], courtIds: [], blockIds: effect.blockIds };
  }
  if (effect.kind === "move_block") {
    return { matchIds: [], courtIds: [], blockIds: [effect.blockId] };
  }
  return { matchIds: [], courtIds: [], blockIds: [] };
}

let realtimeBound = false;

export const useStore = create<CourtOpsStore>((set, get) => ({
  ...makeInitial(),
  ready: false,

  // advance elapsed timers for every live match (called once a second).
  // Local-only and never persisted; this is just smooth animation.
  tick: () =>
    set((s) => {
      const matches: Record<string, Match> = {};
      for (const k in s.matches) {
        const m = s.matches[k];
        matches[k] = m.status === "live" ? { ...m, elapsedSec: m.elapsedSec + 1 } : m;
      }
      return { matches };
    }),

  // Sign in, load the live tournament from Supabase, and subscribe to Realtime.
  // Safe to call more than once; the subscription is only bound on first call.
  init: async () => {
    // Ensure an authenticated session so writes pass row level security. The
    // organizer dashboard writes; the player phone only reads, so a failure
    // here is non-fatal (reads still work as the anon role).
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn(
          "Supabase anonymous sign-in failed (writes will be blocked). Enable Anonymous sign-ins in Authentication settings.",
          error.message
        );
        get().pushToast({
          title: "Sync is read-only",
          body: "Enable Anonymous sign-ins in Supabase to sync changes across devices.",
        });
      }
    }

    // Load every live table in parallel and hydrate the store.
    const [m, c, f, b] = await Promise.all([
      supabase.from("matches").select("*"),
      supabase.from("courts").select("*").order("sort"),
      supabase.from("flags").select("*").order("sort"),
      supabase.from("blocks").select("*"),
    ]);

    const patch: Partial<CourtOpsState> = {};
    if (!m.error && m.data) {
      const matches: Record<string, Match> = {};
      for (const row of m.data as MatchRow[]) matches[row.id] = rowToMatch(row);
      patch.matches = matches;
    }
    if (!c.error && c.data) patch.courts = (c.data as CourtRow[]).map(rowToCourt);
    if (!f.error && f.data) patch.flags = (f.data as FlagRow[]).map(rowToFlag);
    if (!b.error && b.data) patch.blocks = (b.data as BlockRow[]).map(rowToBlock);
    set({ ...patch, ready: true });

    // Subscribe once: merge any remote row change into the store so two devices
    // stay in sync. Our own writes echo back here too, which is harmless because
    // the values match what we already set optimistically.
    if (realtimeBound) return;
    realtimeBound = true;
    supabase
      .channel("courtops")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (p) => {
          const row = p.new as MatchRow;
          if (!row?.id) return;
          set((s) => ({ matches: { ...s.matches, [row.id]: rowToMatch(row) } }));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courts" },
        (p) => {
          const row = p.new as CourtRow;
          if (!row?.id) return;
          set((s) => ({ courts: mergeById(s.courts, rowToCourt(row)) }));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flags" },
        (p) => {
          const row = p.new as FlagRow;
          if (!row?.id) return;
          set((s) => ({ flags: mergeById(s.flags, rowToFlag(row)) }));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks" },
        (p) => {
          const row = p.new as BlockRow;
          if (!row?.id) return;
          set((s) => ({ blocks: mergeById(s.blocks, rowToBlock(row)) }));
        }
      )
      .subscribe();
  },

  // Resolve a flag: apply its effect locally (snappy), announce it, then persist
  // the changed rows so Realtime broadcasts the change to every other device.
  resolveFlag: (id, opts = {}) => {
    const s = get();
    const flag = s.flags.find((f) => f.id === id);
    if (!flag || flag.resolved) return;

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
    // Optimistic local update.
    set({ matches, courts, blocks, flags, toasts: [...s.toasts, toast] });

    // Persist the changed rows (fire and forget; Realtime keeps others in sync).
    void persist(flag.effect, { matches, courts, blocks }, id, {
      resolved: true,
      method: opts.method ?? "manual",
      sent: opts.sent ?? null,
    });
  },

  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: nextToastId() }] })),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  openCount: () => get().flags.filter((f) => !f.resolved).length,
  delayActive: () => !get().flags.find((f) => f.id === "f2")?.resolved,
}));

// Replace an item in an array by id, preserving order; append if new.
function mergeById<T extends { id: string }>(arr: T[], item: T): T[] {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i === -1) return [...arr, item];
  const next = arr.slice();
  next[i] = item;
  return next;
}

// Write the rows an effect touched, plus the flag's resolved state and an
// activity log entry, back to Supabase.
async function persist(
  effect: Effect,
  next: { matches: Record<string, Match>; courts: Court[]; blocks: Block[] },
  flagId: string,
  flagPatch: { resolved: boolean; method: string; sent: boolean | null }
) {
  const { matchIds, courtIds, blockIds } = touchedByEffect(effect);

  // Each update uses .select() so we can tell whether a row actually changed.
  // Row level security blocks writes silently (no error, 0 rows) when there is
  // no authenticated session, so counting returned rows is how we detect that.
  type Res = { error: unknown; data: unknown[] | null };
  const updates: PromiseLike<Res>[] = [];

  for (const id of matchIds) {
    const m = next.matches[id];
    if (m) updates.push(supabase.from("matches").update(matchToRow(m)).eq("id", id).select());
  }
  for (const id of courtIds) {
    const idx = next.courts.findIndex((c) => c.id === id);
    const c = next.courts[idx];
    if (c) updates.push(supabase.from("courts").update(courtToRow(c, idx)).eq("id", id).select());
  }
  for (const id of blockIds) {
    const b = next.blocks.find((x) => x.id === id);
    if (b) updates.push(supabase.from("blocks").update(blockToRow(b)).eq("id", id).select());
  }
  updates.push(
    supabase
      .from("flags")
      .update({ resolved: flagPatch.resolved, method: flagPatch.method, sent: flagPatch.sent })
      .eq("id", flagId)
      .select()
  );

  const results = await Promise.all(updates);
  let blocked = false;
  for (const r of results) {
    if (r.error) console.warn("Supabase write failed:", r.error);
    else if (!r.data || r.data.length === 0) blocked = true; // RLS silently blocked it
  }

  // The activity log is best-effort; don't let it affect the blocked check.
  const act = await supabase.from("activity").insert({
    kind: "flag_resolved",
    flag_id: flagId,
    method: flagPatch.method,
    detail: { effect, sent: flagPatch.sent },
  });
  if (act.error) console.warn("Activity log failed:", act.error);

  if (blocked) {
    console.warn(
      "Write was blocked by row level security (no authenticated session). Enable Anonymous sign-ins in Supabase."
    );
    useStore.getState().pushToast({
      title: "Change didn't sync",
      body: "No write access. Enable Anonymous sign-ins in Supabase so changes persist.",
    });
  }
}
