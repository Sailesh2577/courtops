"use client";

// Court board — a floor plan of the hall. Each court is drawn as an actual
// court in its real floor position and filled by status, so an organizer reads
// the room at a glance. Reads the shared store, so resolving a flag (here or on
// "Needs you") makes the affected court light up in place. When a court flips
// to live the tile plays the "assign" flash: the signature one-action moment.
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { CATS, clock, mmss, type Court, type Match } from "@/lib/data";

// Compact side label: last names joined, e.g. ["Maya Lin","Sofia Marin"] -> "Lin/Marin".
const lastName = (n: string) => n.split(/\s+/).filter(Boolean).slice(-1)[0] ?? n;
const sideShort = (names: string[]) => names.map(lastName).join("/");

// Which visual state a court is in. Attention (a flag points at it) wins, so the
// most expensive courts read red even when technically "idle".
function courtKind(court: Court): "live" | "warm" | "alert" | "idle" {
  if (court.attention) return "alert";
  if (court.status === "live") return "live";
  if (court.status === "ready" || court.status === "warming") return "warm";
  return "idle";
}

function CourtTile({ court, index }: { court: Court; index: number }) {
  const matches = useStore((s) => s.matches);
  const flags = useStore((s) => s.flags);
  const resolveFlag = useStore((s) => s.resolveFlag);

  const match: Match | null = court.matchId ? matches[court.matchId] : null;
  // the unresolved flag wired to this court (drives the idle-court quick action)
  const flag = flags.find(
    (f) => !f.resolved && "courtId" in f.effect && f.effect.courtId === court.id
  );
  // for an empty court that a match is waiting on, pull the incoming match so we
  // can name it on the tile even though it isn't assigned here yet.
  const incoming: Match | null =
    !match && flag && "matchId" in flag.effect ? matches[flag.effect.matchId] ?? null : null;

  const kind = courtKind(court);
  const num = court.id.replace(/^C/, "");

  // Play the assign flash exactly when this court transitions into "live".
  const [flash, setFlash] = useState(false);
  const prevStatus = useRef(court.status);
  useEffect(() => {
    if (prevStatus.current !== "live" && court.status === "live") {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1300);
      prevStatus.current = court.status;
      return () => clearTimeout(t);
    }
    prevStatus.current = court.status;
  }, [court.status]);

  return (
    <div
      className={`fp-court is-${kind}${flash ? " fp-flash" : ""}`}
      style={{ animationDelay: `${index * 45}ms` }}
      title={court.name}
    >
      <div className="fp-mk" />
      <div className="fp-net" />
      <div className="fp-info">
        <div className="fp-n">{num}</div>

        {match && match.status === "live" && (
          <>
            <div className="fp-st">{match.overrun ? "Live · over plan" : "Live"}</div>
            <div className="fp-who">
              {sideShort(match.a)} v {sideShort(match.b)}
            </div>
            <div className={"fp-clk" + (match.overrun ? " over" : "")}>
              {match.overrun ? `+${match.overrun} min over` : mmss(match.elapsedSec)}
            </div>
          </>
        )}

        {match && (match.status === "ready" || match.status === "warming") && (
          <>
            <div className="fp-st">{match.status === "warming" ? "Warm-up" : "Ready"}</div>
            <div className="fp-who">
              {sideShort(match.a)} v {sideShort(match.b)}
            </div>
            <div className="fp-clk">
              {match.startsInMin ? `~${match.startsInMin} min` : CATS[match.cat].short}
            </div>
          </>
        )}

        {!match && court.attention && (
          <>
            <div className="fp-st">{incoming ? "Open · match ready" : "Needs you"}</div>
            {incoming && (
              <div className="fp-who">
                {sideShort(incoming.a)} v {sideShort(incoming.b)}
              </div>
            )}
            {flag ? (
              <button
                className="fp-act"
                onClick={() => resolveFlag(flag.id, { sent: true, method: "auto" })}
              >
                {flag.type === "idle_court" ? "Send here" : "Call players"}
              </button>
            ) : (
              court.note && <div className="fp-clk">{court.note}</div>
            )}
          </>
        )}

        {!match && !court.attention && <div className="fp-st">Open</div>}
      </div>
    </div>
  );
}

export function BoardView() {
  const courts = useStore((s) => s.courts);
  const nowMin = useStore((s) => s.nowMin);
  const openCount = useStore((s) => s.openCount);

  const live = courts.filter((c) => c.status === "live").length;
  const idle = courts.filter((c) => c.status === "idle").length;
  const ready = courts.filter((c) => c.status === "ready" || c.status === "warming").length;
  const usage = Math.round((live / courts.length) * 100);
  const needs = openCount();

  return (
    <div className="view view-board">
      <div className="view-head">
        <div>
          <h1 className="view-title">Court board</h1>
          <p className="view-sub">
            {courts.length} courts · {live} live · {ready} ready · {idle} idle
            {needs > 0 ? ` · ${needs} need you` : ""}
          </p>
        </div>
        <div className="view-head-right">
          <div className="board-usage">
            <span className="board-usage-v">{usage}%</span>
            <span className="board-usage-l">court usage</span>
          </div>
          <span className="head-clock">{clock(nowMin)}</span>
        </div>
      </div>

      <div className="fp-venue">
        <span className="fp-venue-label">Lincoln Sports Center · show court layout</span>
        <div className="fp-map">
          {courts.map((c, i) => (
            <CourtTile key={c.id} court={c} index={i} />
          ))}
        </div>
        <span className="fp-entrance">↑ Entrance / check-in</span>
      </div>
    </div>
  );
}
