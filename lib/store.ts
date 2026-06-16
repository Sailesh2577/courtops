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
import type { CopilotPlan } from "./copilot";
import type { User } from "@supabase/supabase-js";
import {
  rowToMatch,
  rowToCourt,
  rowToFlag,
  rowToBlock,
  matchToRow,
  courtToRow,
  flagToRow,
  blockToRow,
  type MatchRow,
  type CourtRow,
  type FlagRow,
  type BlockRow,
} from "./supabaseRows";

// The single source of truth for the whole tournament. Every screen reads from
// here. The data lives in Supabase: init() signs in, loads the live tables, and
// subscribes to Realtime so a change made on one device shows up on another.
// Resolving a flag updates the store optimistically and writes the changed rows
// back, which Realtime then broadcasts to every other client.
//
// The per-second timer tick stays local and cosmetic: we never write it, so it
// never causes a write storm and the demo numbers stay stable across devices.

type ResolveOpts = { sent?: boolean; method?: "manual" | "auto" };

type CourtOpsStore = CourtOpsState & {
  ready: boolean; // true once the first load from Supabase has completed
  user: User | null; // the signed-in organizer, or null (anon player / signed out)
  authReady: boolean; // true once the initial session check has completed
  tick: () => void;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resolveFlag: (id: string, opts?: ResolveOpts) => void;
  applyPlan: (plan: CopilotPlan) => Promise<void>;
  resetDemo: () => Promise<void>;
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
let authBound = false;

export const useStore = create<CourtOpsStore>((set, get) => ({
  ...makeInitial(),
  ready: false,
  user: null,
  authReady: false,

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

  // Load the live tournament from Supabase and subscribe to Realtime. Also
  // restores any existing organizer session. Safe to call more than once; the
  // listeners are only bound on the first call.
  init: async () => {
    // Restore the organizer session if there is one. Reads do not need it (the
    // player phone reads as the anon role); only writes do, gated by RLS.
    const { data: sessionData } = await supabase.auth.getSession();
    set({ user: sessionData.session?.user ?? null, authReady: true });

    // Keep the store in sync if the session changes in another tab or expires.
    if (!authBound) {
      authBound = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, authReady: true });
      });
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

  // Sign the organizer in with email + password. On success the session is
  // persisted by the Supabase client, so writes start passing RLS immediately.
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
    set({ user: data.user ?? null, authReady: true });
    return { error: null };
  },

  // Sign the organizer out. The dashboard falls back to read-only (anon).
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
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
    // Optimistic local update. Each cleared flag counts as one organizer fix,
    // which feeds the headline fixes/hour metric.
    set({ matches, courts, blocks, flags, fixes: s.fixes + 1, toasts: [...s.toasts, toast] });

    // Persist the changed rows (fire and forget; Realtime keeps others in sync).
    void persist(flag.effect, { matches, courts, blocks }, id, {
      resolved: true,
      method: opts.method ?? "manual",
      sent: opts.sent ?? null,
    });
  },

  // Apply a copilot plan the organizer approved. Walks the steps onto local
  // copies of the state (reusing the same applyEffect the flag flow uses), sets
  // it all at once for a snappy update, then persists every touched row so
  // Realtime broadcasts the change. The copilot never writes on its own; this
  // only runs after a human clicks Approve.
  applyPlan: async (plan) => {
    const s = get();
    let matches = { ...s.matches };
    let courts = s.courts;
    let blocks = s.blocks;
    let flags = s.flags;

    const matchIds = new Set<string>();
    const courtIds = new Set<string>();
    const blockIds = new Set<string>();
    const flagIds = new Set<string>();
    const sentTo: string[] = [];

    for (const step of plan.steps) {
      if (step.kind === "assign_court") {
        const r = applyEffect(
          { ...s, matches, courts, blocks },
          { kind: "assign_court", matchId: step.matchId, courtId: step.courtId }
        );
        matches = r.matches;
        courts = r.courts;
        matchIds.add(step.matchId);
        courtIds.add(step.courtId);
      } else if (step.kind === "move_block") {
        const r = applyEffect(
          { ...s, matches, courts, blocks },
          { kind: "move_block", blockId: step.blockId, toSlot: step.toSlot }
        );
        blocks = r.blocks;
        blockIds.add(step.blockId);
      } else if (step.kind === "resolve_flag") {
        flags = flags.map((f) =>
          f.id === step.flagId ? { ...f, resolved: true, method: "auto" } : f
        );
        flagIds.add(step.flagId);
      } else if (step.kind === "send_message") {
        sentTo.push(step.to);
      }
    }

    const toasts: Toast[] = [
      { id: nextToastId(), title: "Plan applied", body: plan.summary },
    ];
    if (sentTo.length) {
      toasts.push({
        id: nextToastId(),
        title: "Message sent",
        body: `Sent to ${sentTo.join(", ")}.`,
      });
    }

    // Optimistic local update. An approved plan is one organizer fix.
    set({ matches, courts, blocks, flags, fixes: s.fixes + 1, toasts: [...s.toasts, ...toasts] });

    // Persist the rows the plan touched (fire and forget; Realtime syncs others).
    await persistChanges(
      { matches, courts, blocks },
      {
        matchIds: [...matchIds],
        courtIds: [...courtIds],
        blockIds: [...blockIds],
        flagIds: [...flagIds],
      },
      { summary: plan.summary, steps: plan.steps }
    );
  },

  // Reset the demo back to the seed tournament, so the signature flows can be
  // re-run live without the seed script. Restores the local store immediately,
  // then writes the seed values to every row as the organizer (the same write
  // path resolveFlag uses), which Realtime broadcasts to the player phone too.
  resetDemo: async () => {
    const fresh = makeInitial();

    // Local first for a snappy reset; keep auth/ready as they are.
    set({
      nowMin: fresh.nowMin,
      matches: fresh.matches,
      courts: fresh.courts,
      flags: fresh.flags,
      blocks: fresh.blocks,
      scheduleGenerated: fresh.scheduleGenerated,
      estIdle: fresh.estIdle,
      fixes: fresh.fixes,
      toasts: [
        ...get().toasts,
        { id: nextToastId(), title: "Demo reset", body: "Back to the seed tournament." },
      ],
    });

    // Write the seed values back to every row, then check whether RLS blocked us.
    type Res = { error: unknown; data: unknown[] | null };
    const updates: PromiseLike<Res>[] = [];
    for (const m of Object.values(fresh.matches)) {
      updates.push(supabase.from("matches").update(matchToRow(m)).eq("id", m.id).select());
    }
    fresh.courts.forEach((c, i) => {
      updates.push(supabase.from("courts").update(courtToRow(c, i)).eq("id", c.id).select());
    });
    fresh.flags.forEach((f, i) => {
      updates.push(supabase.from("flags").update(flagToRow(f, i)).eq("id", f.id).select());
    });
    for (const b of fresh.blocks) {
      updates.push(supabase.from("blocks").update(blockToRow(b)).eq("id", b.id).select());
    }

    const results = await Promise.all(updates);
    let blocked = false;
    for (const r of results) {
      if (r.error) console.warn("Reset write failed:", r.error);
      else if (!r.data || r.data.length === 0) blocked = true;
    }

    const act = await supabase.from("activity").insert({ kind: "demo_reset", method: "manual" });
    if (act.error) console.warn("Activity log failed:", act.error);

    if (blocked) {
      useStore.getState().pushToast({
        title: "Reset didn't sync",
        body: "You're signed out. Sign in as the organizer so the reset persists.",
      });
    }
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
      "Write was blocked by row level security (no organizer session). Sign in as the organizer to make changes."
    );
    useStore.getState().pushToast({
      title: "Change didn't sync",
      body: "You're signed out. Sign in as the organizer so changes persist.",
    });
  }
}

// Write an arbitrary set of touched rows (used by the copilot, which can touch
// several matches/courts/blocks/flags in one approved plan). Mirrors persist()
// but takes explicit id lists instead of deriving them from a single effect.
async function persistChanges(
  next: { matches: Record<string, Match>; courts: Court[]; blocks: Block[] },
  touched: {
    matchIds: string[];
    courtIds: string[];
    blockIds: string[];
    flagIds: string[];
  },
  activityDetail: unknown
) {
  type Res = { error: unknown; data: unknown[] | null };
  const updates: PromiseLike<Res>[] = [];

  for (const id of touched.matchIds) {
    const m = next.matches[id];
    if (m) updates.push(supabase.from("matches").update(matchToRow(m)).eq("id", id).select());
  }
  for (const id of touched.courtIds) {
    const idx = next.courts.findIndex((c) => c.id === id);
    const c = next.courts[idx];
    if (c) updates.push(supabase.from("courts").update(courtToRow(c, idx)).eq("id", id).select());
  }
  for (const id of touched.blockIds) {
    const b = next.blocks.find((x) => x.id === id);
    if (b) updates.push(supabase.from("blocks").update(blockToRow(b)).eq("id", id).select());
  }
  for (const id of touched.flagIds) {
    updates.push(
      supabase
        .from("flags")
        .update({ resolved: true, method: "auto" })
        .eq("id", id)
        .select()
    );
  }

  if (updates.length === 0) return; // a message-only plan changes no rows

  const results = await Promise.all(updates);
  let blocked = false;
  for (const r of results) {
    if (r.error) console.warn("Supabase write failed:", r.error);
    else if (!r.data || r.data.length === 0) blocked = true;
  }

  const act = await supabase.from("activity").insert({
    kind: "copilot_plan",
    method: "auto",
    detail: activityDetail,
  });
  if (act.error) console.warn("Activity log failed:", act.error);

  if (blocked) {
    console.warn("Copilot write blocked by RLS (no organizer session).");
    useStore.getState().pushToast({
      title: "Change didn't sync",
      body: "You're signed out. Sign in as the organizer so changes persist.",
    });
  }
}
