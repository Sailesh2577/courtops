"use client";

// "Delay radar" — the predictive screen. Where Needs You ranks decisions by the
// cost of waiting, this ranks live matches by how far over plan they are and
// shows what each one pushes downstream, before it cascades into the finals.
// Same Swiss grid idiom: a stat-band masthead, a numbered ranked index, and a
// spec-sheet detail pane. The detail offers the same fix the decision feed
// knows about (resolving the matching flag), so one action still updates
// everything: board, schedule, and the player phone.

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { clockShort, type Severity } from "@/lib/data";
import { computeRadar, type RadarItem } from "@/lib/radar";

const SEV_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function ItemRow({
  item,
  rank,
  active,
  onClick,
  delay,
}: {
  item: RadarItem;
  rank: number;
  active: boolean;
  onClick: () => void;
  delay: number;
}) {
  return (
    <button
      className={`nf-row sev-${item.severity}` + (active ? " is-on" : "")}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="nf-rank">{rank}</span>
      <span className="nf-row-body">
        <span className="nf-row-h">
          {item.courtName} is {item.overMin} min over plan
        </span>
        <span className="nf-row-meta">
          <span className={`nf-sev nf-sev--${item.severity}`}>
            {SEV_LABEL[item.severity]}
          </span>
          <span className="nf-where">
            {item.title} · {item.atRiskCount} downstream at risk
          </span>
        </span>
      </span>
    </button>
  );
}

function PushTag({ pushMin }: { pushMin: number }) {
  if (pushMin <= 0) {
    return <span className="rd-push rd-push--ok">On time</span>;
  }
  return <span className="rd-push rd-push--risk">+{pushMin} min</span>;
}

function Detail({ item }: { item: RadarItem }) {
  const resolveFlag = useStore((s) => s.resolveFlag);
  const flags = useStore((s) => s.flags);
  const [busy, setBusy] = useState(false);

  const flag = item.flagId ? flags.find((f) => f.id === item.flagId) : undefined;
  const fixed = flag?.resolved;

  const applyFix = () => {
    if (!flag) return;
    setBusy(true);
    setTimeout(() => {
      resolveFlag(flag.id, { sent: true, method: "manual" });
      setBusy(false);
    }, 420);
  };

  return (
    <div className="nf-detail" key={item.matchId}>
      <div className="nf-detail-meta">
        <span className={`nf-sev nf-sev--${item.severity}`}>
          {SEV_LABEL[item.severity]}
        </span>
        <span className="nf-where">
          {item.courtName} · {item.title}
        </span>
      </div>
      <h2 className="nf-detail-title">{item.pairing}</h2>

      <div className="rd-metrics">
        <div className="rd-metric">
          <span className="rd-metric-l">Behind plan</span>
          <span className="rd-metric-v red">{item.overMin}m</span>
        </div>
        <div className="rd-metric">
          <span className="rd-metric-l">Elapsed / plan</span>
          <span className="rd-metric-v">
            {item.elapsedMin}/{item.planMin}m
          </span>
        </div>
        <div className="rd-metric">
          <span className="rd-metric-l">Proj. finish</span>
          <span className="rd-metric-v">{clockShort(item.projectedFinishMin)}</span>
        </div>
        <div className="rd-metric">
          <span className="rd-metric-l">Court free</span>
          <span className="rd-metric-v">{clockShort(item.projectedFreeMin)}</span>
        </div>
      </div>

      <div className="nf-spec">
        <span className="nf-spec-l">What it pushes</span>
        {item.downstream.length === 0 ? (
          <p>Nothing is queued behind this court. The overrun ends here.</p>
        ) : (
          <ol className="rd-chain">
            {item.downstream.map((d) => (
              <li
                key={d.blockId}
                className={"rd-link" + (d.pushMin > 0 ? " is-risk" : "")}
              >
                <span className="rd-link-main">
                  <span className="rd-link-label">{d.label}</span>
                  <span className="rd-link-pair">{d.pairing}</span>
                </span>
                <span className="rd-link-time">
                  <span className="rd-link-clock">
                    {clockShort(d.plannedStartMin)}
                    {d.pushMin > 0 && (
                      <>
                        {" "}
                        <Icon name="arrow" size={11} />{" "}
                        {clockShort(d.projectedStartMin)}
                      </>
                    )}
                  </span>
                  <PushTag pushMin={d.pushMin} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {flag ? (
        fixed ? (
          <div className="rd-fixed">
            <span className="rd-fixed-mark">
              <Icon name="check" size={22} stroke={2.4} />
            </span>
            <div>
              <div className="rd-fixed-t">Rebalanced</div>
              <div className="rd-fixed-s">{flag.suggestion}.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="nf-spec">
              <span className="nf-spec-l accent">Recommended</span>
              <div className="nf-reco-b">
                <Icon
                  name="bolt"
                  size={17}
                  fill
                  style={{ color: "var(--accent)", flexShrink: 0 }}
                />
                <span>{flag.suggestion}</span>
              </div>
            </div>
            <div className="nf-actions">
              <button className="nf-do" onClick={applyFix} disabled={busy}>
                <Icon name="check" size={15} stroke={2.2} /> Apply fix &amp; notify
              </button>
            </div>
          </>
        )
      ) : (
        <div className="rd-hint">
          <Icon name="sparkle" size={14} /> No queued conflict yet. Press{" "}
          <kbd>⌘K</kbd> to ask the copilot to rebalance.
        </div>
      )}
    </div>
  );
}

export function RadarView() {
  const matches = useStore((s) => s.matches);
  const courts = useStore((s) => s.courts);
  const blocks = useStore((s) => s.blocks);
  const flags = useStore((s) => s.flags);
  const nowMin = useStore((s) => s.nowMin);

  const radar = useMemo(
    () => computeRadar({ matches, courts, blocks, flags, nowMin }),
    [matches, courts, blocks, flags, nowMin],
  );

  const [sel, setSel] = useState<string | null>(null);

  // Derive the active item during render: honor the click if it still points at
  // a ranked item, otherwise fall back to the worst one. A fix can drop an item
  // out of risk, so we never store a stale selection (no syncing effect).
  const selected =
    radar.items.find((it) => it.matchId === sel) ?? radar.items[0] ?? null;

  return (
    <div className="view view-flags">
      <div className="nf-band">
        <h1 className="nf-title">Delay radar</h1>
        <div className="nf-stat">
          <span className="nf-stat-l">Over plan</span>
          <span className={"nf-stat-v" + (radar.overCount ? " red" : "")}>
            {radar.overCount}
          </span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Most behind</span>
          <span className={"nf-stat-v" + (radar.maxOverMin ? " red" : "")}>
            {radar.maxOverMin}m
          </span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">At risk</span>
          <span className="nf-stat-v">{radar.atRiskCount}</span>
        </div>
      </div>

      <div className="nf-wrap">
        <div className="nf-list">
          <div className="nf-list-head">Live matches · ranked by minutes over plan</div>

          {radar.items.length === 0 && (
            <div className="nf-allclear">
              <span className="nf-allclear-mark">
                <Icon name="check" size={20} stroke={2.4} />
              </span>
              <div>
                <div className="nf-allclear-t">On schedule</div>
                <div className="nf-allclear-s">No court is running behind plan.</div>
              </div>
            </div>
          )}

          {radar.items.map((it, i) => (
            <ItemRow
              key={it.matchId}
              item={it}
              rank={i + 1}
              active={it.matchId === selected?.matchId}
              onClick={() => setSel(it.matchId)}
              delay={i * 45}
            />
          ))}

          {radar.onTrack.length > 0 && (
            <>
              <div className="nf-sect">On track · {radar.onTrack.length}</div>
              {radar.onTrack.map((o) => (
                <div key={o.matchId} className="rd-ontrack">
                  <span className="rd-ontrack-court">{o.courtName}</span>
                  <span className="rd-ontrack-body">
                    <span className="rd-ontrack-h">{o.title}</span>
                    <span className="rd-ontrack-pair">{o.pairing}</span>
                  </span>
                  <span className="rd-ontrack-rem">~{o.remainingMin}m left</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="nf-detail-pane">
          {selected ? (
            <Detail item={selected} />
          ) : (
            <div className="nf-empty">
              <Icon name="signal" size={32} />
              <p>Every court is on plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
