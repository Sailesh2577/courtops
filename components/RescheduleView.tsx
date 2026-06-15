"use client";

// Reschedule — when the day drifts from the plan, CourtOps replans the rest and
// the organizer confirms. Driven by flag f2 (Court 1 running behind); applying
// it resolves f2 in the shared store, which also clears the sidebar ping and
// the "Needs you" row. Ported from the design handoff's reschedule.jsx.
import { useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { clockShort } from "@/lib/data";

type Slot = { t: string; c: string };
type Move = {
  id: string;
  cat: string;
  title: string;
  players: string;
  from: Slot;
  to: Slot;
  courtMove?: boolean;
  why: string;
};

const MOVES: Move[] = [
  {
    id: "r1", cat: "MS", title: "Men's Singles Final", players: "Winner of Court 1 SF",
    from: { t: "3:00", c: "C1" }, to: { t: "3:15", c: "C1" },
    why: "Has to wait for Court 1 to finish, pushed 15 min.",
  },
  {
    id: "r2", cat: "XD", title: "Mixed Doubles Semifinal", players: "Haddad / Bennett vs Torres / Cohen",
    from: { t: "3:00", c: "C4" }, to: { t: "3:00", c: "C6" }, courtMove: true,
    why: "Kept on time by moving to open Court 6.",
  },
  {
    id: "r3", cat: "WS", title: "Women's Singles Semifinal", players: "Rao / Nair winner vs Kapoor / Sato winner",
    from: { t: "3:30", c: "C5" }, to: { t: "3:45", c: "C5" },
    why: "Knock-on from the final, pushed 15 min.",
  },
];

const GUARDS = [
  "No player double-booked",
  "Every player keeps at least 10 min rest",
  "No court left sitting idle",
  "Finals still finish by 4:30 PM",
];

function Chip({ slot, tone }: { slot: Slot; tone: "from" | "to" | "done" }) {
  return (
    <span className={"rs-chip rs-chip-" + tone}>
      <span className="rs-chip-t">{slot.t}</span>
      <span className="rs-chip-c">{slot.c.replace("C", "Ct ")}</span>
    </span>
  );
}

function MoveRow({ m, applied, i }: { m: Move; applied: boolean; i: number }) {
  return (
    <div className={"rs-row" + (applied ? " rs-row-done" : "")} style={{ transitionDelay: `${i * 70}ms` }}>
      <div className="rs-row-head">
        <span className="rs-row-cat">{m.cat}</span>
        <div className="rs-row-info">
          <div className="rs-row-title">{m.title}</div>
          <div className="rs-row-players">{m.players}</div>
        </div>
        {m.courtMove && (
          <span className="rs-row-tag">
            <Icon name="pin" size={12} />
            court change
          </span>
        )}
      </div>
      <div className="rs-row-move">
        <Chip slot={m.from} tone="from" />
        <Icon name="arrow" size={16} className="rs-row-arrow" />
        <Chip slot={m.to} tone={applied ? "done" : "to"} />
        {applied && (
          <span className="rs-row-check">
            <Icon name="check" size={14} stroke={2.6} />
          </span>
        )}
      </div>
      <div className="rs-row-why">{m.why}</div>
    </div>
  );
}

export function RescheduleView() {
  const flags = useStore((s) => s.flags);
  const nowMin = useStore((s) => s.nowMin);
  const resolveFlag = useStore((s) => s.resolveFlag);

  const flag = flags.find((f) => f.id === "f2")!;
  const applied = flag.resolved;
  const [applying, setApplying] = useState(false);

  const apply = () => {
    setApplying(true);
    setTimeout(() => {
      resolveFlag("f2", { sent: true, method: "manual" });
      setApplying(false);
    }, 720);
  };

  return (
    <div className="view view-reschedule">
      <div className="nf-band">
        <h1 className="nf-title">Reschedule</h1>
        <div className="nf-stat">
          <span className="nf-stat-l">Moves</span>
          <span className="nf-stat-v">{MOVES.length}</span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Players</span>
          <span className="nf-stat-v">4</span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Local time</span>
          <span className="nf-stat-v">{clockShort(nowMin)}</span>
        </div>
      </div>

      <div className={"rs-trigger" + (applied ? " rs-trigger-done" : "")}>
        <span className="rs-trigger-ic">
          <Icon name={applied ? "check" : "clock"} size={22} stroke={2.2} />
        </span>
        <div className="rs-trigger-txt">
          <div className="rs-trigger-t">
            {applied ? "Schedule replanned, back on track" : "Court 1 is running 16 min behind"}
          </div>
          <div className="rs-trigger-s">
            {applied
              ? "The delay was absorbed across 3 matches. Everyone affected has been notified."
              : "Chen vs Park went to a third game. The 16-minute overrun ripples into 3 downstream matches."}
          </div>
        </div>
        <div className="rs-trigger-metric">
          <span className="rs-trigger-metric-v">
            {applied ? "0" : "16"}
            <small>min</small>
          </span>
          <span className="rs-trigger-metric-l">{applied ? "on schedule" : "over & cascading"}</span>
        </div>
      </div>

      <div className="rs-wrap">
        <div className="rs-plan">
          <div className="rs-plan-head">
            <span className="rs-plan-h-l">
              <span className="sw-ai">AI</span>
              {applied ? "Plan applied" : "Proposed plan"}
            </span>
            <span className="rs-plan-sub">{MOVES.length} matches rearranged</span>
          </div>
          <div className="rs-rows">
            {MOVES.map((m, i) => (
              <MoveRow key={m.id} m={m} applied={applied} i={i} />
            ))}
          </div>
        </div>

        <aside className="rs-side">
          <div className="rs-card">
            <div className="rs-card-h">
              <Icon name="check" size={15} stroke={2.2} />
              Guardrails
            </div>
            <ul className="rs-guards">
              {GUARDS.map((g) => (
                <li key={g}>
                  <span className="rs-guard-ck">
                    <Icon name="check" size={12} stroke={2.8} />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <div className="rs-card">
            <div className="rs-card-h">
              <Icon name="signal" size={15} />
              Impact
            </div>
            <div className="rs-impact">
              <div className="rs-imp">
                <b>
                  16<small>m</small>
                </b>
                <span>delay absorbed</span>
              </div>
              <div className="rs-imp">
                <b>1</b>
                <span>court reassigned</span>
              </div>
              <div className="rs-imp">
                <b>4</b>
                <span>players notified</span>
              </div>
              <div className="rs-imp">
                <b>0</b>
                <span>conflicts created</span>
              </div>
            </div>
          </div>

          {!applied ? (
            <div className="rs-card rs-card-msg">
              <div className="rs-msg-head">
                <span className="sw-ai">AI</span>
                One message covers all 4
              </div>
              <p className="rs-msg-body">{flag.message.body}</p>
              <button
                className="sw-btn sw-full"
                onClick={apply}
                disabled={applying}
              >
                {!applying && <Icon name="refresh" size={15} />}
                {applying ? "Applying…" : "Apply reshuffle & notify"}
              </button>
              <button className="rs-override">Adjust manually instead</button>
            </div>
          ) : (
            <div className="rs-done">
              <div className="rs-done-badge">
                <Icon name="send" size={20} />
              </div>
              <div className="rs-done-t">Notified 4 players</div>
              <div className="rs-done-s">Schedule updated across Courts 1, 4 and 6.</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
