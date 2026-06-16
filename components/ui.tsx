"use client";

// Shared presentational primitives. No data, no state.

// A status union used across the schedule and player surfaces.
export type StatusKey = "live" | "ready" | "warming" | "idle" | "done";

// Two-letter initials for the avatar fallback.
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

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
