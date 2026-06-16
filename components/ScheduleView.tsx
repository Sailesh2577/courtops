"use client";

// Schedule builder: the imported draw placed on courts and times. The Rohan
// back-to-back conflict (flag f3) is highlighted; clicking it opens the fix
// that, when applied, moves his doubles block in the shared store. Sized to
// the event's court count.
import { useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { SLOTS, SLOT_START, clockShort, type Block } from "@/lib/data";

const ROWH = 86;

function ScheduleBlock({
  b,
  idx,
  generated,
  courtIds,
  onPick,
}: {
  b: Block;
  idx: number;
  generated: boolean;
  courtIds: string[];
  onPick: (b: Block) => void;
}) {
  const n = courtIds.length;
  const ci = courtIds.indexOf(b.court);
  const style: React.CSSProperties = {
    left: `calc(${ci} * (100% / ${n}) + 5px)`,
    width: `calc((100% / ${n}) - 10px)`,
    top: b.slot * ROWH + 5,
    height: ROWH - 10,
    transitionDelay: generated ? `${idx * 45}ms` : "0ms",
  };
  const cls =
    `sb-block sb-${b.state}` +
    (b.highlight ? " sb-hl" : "") +
    (generated ? " sb-in" : " sb-out");
  return (
    <button className={cls} style={style} onClick={() => b.highlight && onPick(b)}>
      <div className="sb-block-top">
        <span className="sb-cat">
          {b.cat} · {b.round}
        </span>
        {b.state === "live" && (
          <span className="sb-live">
            <span className="sb-live-d" />
            LIVE
          </span>
        )}
        {b.state === "done" && <Icon name="check" size={13} stroke={2.4} />}
        {b.highlight && <span className="sb-tag">Rohan</span>}
      </div>
      <div className="sb-block-players">
        <span>{b.a}</span>
        <span className="sb-vs">vs</span>
        <span>{b.b}</span>
      </div>
    </button>
  );
}

export function ScheduleView() {
  const blocks = useStore((s) => s.blocks);
  const courts = useStore((s) => s.courts);
  const nowMin = useStore((s) => s.nowMin);
  const estIdle = useStore((s) => s.estIdle);
  const resolveFlag = useStore((s) => s.resolveFlag);

  const courtIds = courts.map((c) => c.id);
  const n = courtIds.length;

  const [gen, setGen] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [pick, setPick] = useState<Block | null>(null);
  const [idleAfter, setIdleAfter] = useState(estIdle.after);

  const regenerate = () => {
    setGen(false);
    setPick(null);
    setNonce((x) => x + 1);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setGen(true);
        setIdleAfter((prev) => Math.max(38, prev - Math.floor(Math.random() * 8) - 2));
      })
    );
  };

  const applyRohanFix = () => {
    resolveFlag("f3", { sent: true, method: "manual" });
    setPick(null);
  };

  const nowTop = ((nowMin - SLOT_START) / 30) * ROWH;
  const drop = Math.round(((estIdle.before - idleAfter) / estIdle.before) * 100);

  return (
    <div className="view view-schedule">
      <div className="nf-band">
        <h1 className="nf-title">Schedule builder</h1>
        <div className="nf-stat">
          <span className="nf-stat-l">Matches</span>
          <span className="nf-stat-v">{blocks.length}</span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Courts</span>
          <span className="nf-stat-v">{n}</span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Avg player idle</span>
          <span className="nf-stat-v accent">{idleAfter}m</span>
          <span className="nf-stat-sub">
            from {estIdle.before}m · <b>↓{drop}%</b>
          </span>
        </div>
      </div>

      <div className="sb-toolbar">
        <div className="sb-legend">
          {(
            [
              ["done", "Played"],
              ["live", "Live"],
              ["ready", "Ready"],
              ["planned", "Planned"],
            ] as const
          ).map(([k, l]) => (
            <span key={k} className="sb-leg">
              <span className={"sb-leg-d sb-" + k} />
              {l}
            </span>
          ))}
          <span className="sb-leg">
            <span className="sb-leg-d sb-leg-acc" />
            Conflict
          </span>
        </div>
        <button className="sw-btn-soft" onClick={regenerate}>
          <Icon name="refresh" size={14} />
          Regenerate
        </button>
      </div>

      <div className="sb">
        <div className="sb-corner" />
        <div className="sb-cols" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {courtIds.map((c) => (
            <div key={c} className="sb-col-h">
              {c}
            </div>
          ))}
        </div>
        <div className="sb-rows" style={{ height: SLOTS.length * ROWH }}>
          {SLOTS.map((s) => (
            <div key={s} className="sb-row-h" style={{ height: ROWH }}>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="sb-canvas" style={{ height: SLOTS.length * ROWH }}>
          <div className="sb-backdrop">
            {SLOTS.map((_, i) => (
              <div key={"h" + i} className="sb-hline" style={{ top: i * ROWH }} />
            ))}
            {courtIds.map((_, i) => (
              <div key={"v" + i} className="sb-vline" style={{ left: `calc(${i} * (100% / ${n}))` }} />
            ))}
          </div>
          {nowTop > 0 && nowTop < SLOTS.length * ROWH && (
            <div className="sb-now" style={{ top: nowTop }}>
              <span className="sb-now-t">now {clockShort(nowMin)}</span>
            </div>
          )}
          <div className="sb-blocks" key={nonce}>
            {blocks.map((b, i) => (
              <ScheduleBlock
                key={b.id}
                b={b}
                idx={i}
                generated={gen}
                courtIds={courtIds}
                onPick={setPick}
              />
            ))}
          </div>
        </div>
      </div>

      {pick && (
        <div className="sb-pop-wrap" onClick={() => setPick(null)}>
          <div className="sb-pop" onClick={(e) => e.stopPropagation()}>
            <div className="sb-pop-head">
              <span className="sb-pop-ic">
                <Icon name="player" size={18} />
              </span>
              <div>
                <div className="sb-pop-t">Rohan Mehta — back-to-back</div>
                <div className="sb-pop-s">Singles ends 3:00, doubles starts 3:00. No rest.</div>
              </div>
            </div>
            <div className="sb-pop-reco">
              <span className="sw-ai">AI</span>
              <span>Push his doubles to 3:30 PM (about 8 min rest)</span>
            </div>
            <div className="sb-pop-actions">
              <button className="sw-btn" onClick={applyRohanFix}>
                <Icon name="check" size={15} stroke={2.4} />
                Apply fix
              </button>
              <button className="sw-btn-ghost" onClick={() => setPick(null)}>
                Keep as is
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
