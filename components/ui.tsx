"use client";

// Shared UI primitives — ported from the prototype's ui.jsx to typed React.
// Every screen composes these. Presentational only (no data).
import type { ReactNode } from "react";
import { type IconName } from "./Icon";

// ── helpers ──────────────────────────────────────────────────────────────────
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export type StatusKey = "live" | "ready" | "warming" | "idle" | "done";

export const STATUS: Record<
  StatusKey,
  { label: string; varc: string; icon: IconName }
> = {
  live: { label: "Live", varc: "--live", icon: "signal" },
  ready: { label: "Ready", varc: "--ready", icon: "check" },
  warming: { label: "Warm-up", varc: "--ready", icon: "warm" },
  idle: { label: "Idle", varc: "--idle", icon: "clock" },
  done: { label: "Done", varc: "--done", icon: "check" },
};

// ── StatusDot ─────────────────────────────────────────────────────────────────
export function StatusDot({
  status,
  pulse,
}: {
  status: StatusKey;
  pulse?: boolean;
}) {
  const m = STATUS[status] ?? STATUS.idle;
  return (
    <span
      className={"co-dot" + (pulse && status === "live" ? " co-dot-pulse" : "")}
      style={{ background: `var(${m.varc})` }}
    />
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
export function Pill({
  status,
  children,
  soft,
}: {
  status: StatusKey;
  children?: ReactNode;
  soft?: boolean;
}) {
  const m = STATUS[status] ?? STATUS.idle;
  return (
    <span
      className="co-pill"
      style={{
        color: `var(${m.varc})`,
        background: soft
          ? `color-mix(in oklab, var(${m.varc}) 13%, transparent)`
          : "transparent",
        borderColor: `color-mix(in oklab, var(${m.varc}) 35%, transparent)`,
      }}
    >
      <StatusDot status={status} pulse />
      {children ?? m.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 30,
  accent,
}: {
  name: string;
  size?: number;
  accent?: boolean;
}) {
  return (
    <span
      className="co-av"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: accent ? "var(--accent)" : "var(--surface-2)",
        color: accent ? "var(--accent-ink)" : "var(--ink-2)",
        borderColor: accent ? "transparent" : "var(--border)",
      }}
    >
      {initials(name)}
    </span>
  );
}

// ── Stat ──────────────────────────────────────────────────────────────────────
export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="co-stat">
      <div className="co-stat-v" style={accent ? { color: "var(--accent)" } : undefined}>
        {value}
      </div>
      <div className="co-stat-l">{label}</div>
      {sub && <div className="co-stat-s">{sub}</div>}
    </div>
  );
}
