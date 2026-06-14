import { create } from "zustand";

// Minimal toast store for Phase 0. In Phase 1 this folder grows into the full
// single-source-of-truth store (matches, courts, flags, blocks) per the
// design handoff's 04-interactions-and-state.md — toasts stay part of it.
export type Toast = { id: string; title: string; body?: string };

type ToastStore = {
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  pushToast: (t) =>
    set((s) => ({
      toasts: [...s.toasts, { ...t, id: Math.random().toString(36).slice(2) }],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
