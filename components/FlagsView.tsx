"use client";

// "Needs you" — the organizer's home, rebuilt in the Swiss / International
// grid idiom. Where the board is a map of space, this is a strict grid of
// sequence: a numbered feed ranked by cost of waiting, hairline rules, tabular
// figures, hard-edged severity tags, and a spec-sheet detail pane that keeps
// the AI-drafted message flow (the "AI suggests, a person decides" moment).
// Resolving a flag here mutates the shared store, so the board and player view
// update too.
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { clockShort, type Flag, type Severity } from "@/lib/data";

const SEV_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function FlagRow({
  flag,
  rank,
  active,
  onClick,
  delay,
}: {
  flag: Flag;
  rank: number;
  active: boolean;
  onClick: () => void;
  delay: number;
}) {
  return (
    <button
      className={
        `nf-row sev-${flag.severity}` +
        (active ? " is-on" : "") +
        (flag.resolved ? " is-done" : "")
      }
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="nf-rank">
        {flag.resolved ? <Icon name="check" size={18} stroke={2.4} /> : rank}
      </span>
      <span className="nf-row-body">
        <span className="nf-row-h">{flag.title}</span>
        <span className="nf-row-meta">
          {!flag.resolved && (
            <span className={`nf-sev nf-sev--${flag.severity}`}>
              {SEV_LABEL[flag.severity]}
            </span>
          )}
          <span className="nf-where">{flag.where}</span>
        </span>
      </span>
    </button>
  );
}

function MessageCard({
  flag,
  onSend,
  onApplyOnly,
  busy,
}: {
  flag: Flag;
  onSend: () => void;
  onApplyOnly: () => void;
  busy: boolean;
}) {
  // Remounted (keyed by flag id) when the selection changes, so these
  // initialize fresh from props without a reset effect.
  const [body, setBody] = useState(flag.message.body);
  const [edited, setEdited] = useState(false);

  return (
    <div className="nf-msg">
      <div className="nf-msg-head">
        <span className="nf-msg-l">
          <span className="nf-ai">AI</span> Drafted message
        </span>
        <span className="nf-msg-meta">
          {flag.message.channel} · to {flag.message.to}
        </span>
      </div>
      <textarea
        className="nf-msg-text"
        value={body}
        rows={4}
        onChange={(e) => {
          setBody(e.target.value);
          setEdited(true);
        }}
      />
      <div className="nf-msg-note">
        {edited ? (
          <>
            <Icon name="check" size={13} stroke={2.2} /> edited by you
          </>
        ) : (
          flag.message.note
        )}
      </div>
      <div className="nf-actions">
        <button className="nf-do" onClick={onSend} disabled={busy}>
          <Icon name="send" size={15} /> Approve &amp; send
        </button>
        <button className="nf-ghost" onClick={onApplyOnly} disabled={busy}>
          Apply without message
        </button>
      </div>
    </div>
  );
}

function ResolvedPanel({ flag }: { flag: Flag }) {
  return (
    <div className="nf-resolved">
      <span className="nf-resolved-mark">
        <Icon name="check" size={26} stroke={2.4} />
      </span>
      <h3>Handled</h3>
      <p>{flag.suggestion}.</p>
      {flag.sent && (
        <div className="nf-resolved-sent">
          <Icon name="send" size={13} /> Message sent to {flag.message.to}
        </div>
      )}
    </div>
  );
}

function Detail({ flag }: { flag: Flag }) {
  const resolveFlag = useStore((s) => s.resolveFlag);
  const [busy, setBusy] = useState(false);

  const resolve = (sent: boolean) => {
    setBusy(true);
    setTimeout(() => {
      resolveFlag(flag.id, { sent, method: "manual" });
      setBusy(false);
    }, 420);
  };

  if (flag.resolved) return <ResolvedPanel flag={flag} />;

  return (
    <div className="nf-detail" key={flag.id}>
      <div className="nf-detail-meta">
        <span className={`nf-sev nf-sev--${flag.severity}`}>
          {SEV_LABEL[flag.severity]}
        </span>
        <span className="nf-where">{flag.where}</span>
      </div>
      <h2 className="nf-detail-title">{flag.title}</h2>
      <p className="nf-detail-sum">{flag.summary}</p>

      <div className="nf-spec">
        <span className="nf-spec-l">Why it&apos;s flagged</span>
        <p>{flag.reason}</p>
      </div>

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

      <MessageCard
        key={flag.id}
        flag={flag}
        onSend={() => resolve(true)}
        onApplyOnly={() => resolve(false)}
        busy={busy}
      />
    </div>
  );
}

export function FlagsView() {
  const flags = useStore((s) => s.flags);
  const nowMin = useStore((s) => s.nowMin);

  const open = flags.filter((f) => !f.resolved);
  const done = flags.filter((f) => f.resolved);
  const [sel, setSel] = useState<string | null>(open[0]?.id ?? null);

  // When the selected flag gets resolved, slide to the next open one after a
  // beat so the "Handled" panel can be seen first. The setState here runs
  // asynchronously inside the timeout, so it does not cascade renders.
  useEffect(() => {
    const cur = flags.find((f) => f.id === sel);
    if (cur?.resolved) {
      const firstOpen = flags.find((f) => !f.resolved);
      const t = setTimeout(() => setSel(firstOpen?.id ?? cur.id), 900);
      return () => clearTimeout(t);
    }
  }, [flags, sel]);

  const selected = flags.find((f) => f.id === sel);

  return (
    <div className="view view-flags">
      <div className="nf-band">
        <h1 className="nf-title">Needs you</h1>
        <div className="nf-stat">
          <span className="nf-stat-l">Need you</span>
          <span className={"nf-stat-v" + (open.length ? " red" : "")}>
            {open.length}
          </span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Cleared</span>
          <span className="nf-stat-v">{done.length}</span>
        </div>
        <div className="nf-stat">
          <span className="nf-stat-l">Local time</span>
          <span className="nf-stat-v">{clockShort(nowMin)}</span>
        </div>
      </div>

      <div className="nf-wrap">
        <div className="nf-list">
          <div className="nf-list-head">
            Decision feed · ranked by cost of waiting
          </div>
          {open.length === 0 && (
            <div className="nf-allclear">
              <span className="nf-allclear-mark">
                <Icon name="check" size={20} stroke={2.4} />
              </span>
              <div>
                <div className="nf-allclear-t">All clear</div>
                <div className="nf-allclear-s">Nothing needs you right now.</div>
              </div>
            </div>
          )}
          {open.map((f, i) => (
            <FlagRow
              key={f.id}
              flag={f}
              rank={i + 1}
              active={f.id === sel}
              onClick={() => setSel(f.id)}
              delay={i * 45}
            />
          ))}
          {done.length > 0 && (
            <>
              <div className="nf-sect">Cleared · {done.length}</div>
              {done.map((f, i) => (
                <FlagRow
                  key={f.id}
                  flag={f}
                  rank={open.length + i + 1}
                  active={f.id === sel}
                  onClick={() => setSel(f.id)}
                  delay={0}
                />
              ))}
            </>
          )}
        </div>

        <div className="nf-detail-pane">
          {selected ? (
            <Detail flag={selected} />
          ) : (
            <div className="nf-empty">
              <Icon name="shuttle" size={32} />
              <p>You&apos;re all caught up.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
