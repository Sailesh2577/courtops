"use client";

// "Needs you" — the organizer's home. A ranked feed of things that need a
// decision, with an AI-drafted message ready to send. Resolving a flag here
// mutates the shared store, so the board and player view update too. Ported
// from the design handoff's flags.jsx.
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Severity, AIChip, Button, ViewHead } from "./ui";
import { useStore } from "@/lib/store";
import { clock, type Flag } from "@/lib/data";

function FlagRow({
  flag,
  active,
  onClick,
}: {
  flag: Flag;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        "fl-row" + (active ? " fl-row-on" : "") + (flag.resolved ? " fl-row-done" : "")
      }
      onClick={onClick}
    >
      <span className="fl-row-ic" data-sev={flag.severity}>
        {flag.resolved ? (
          <Icon name="check" size={16} stroke={2.4} />
        ) : (
          <Icon name={flag.icon} size={17} />
        )}
      </span>
      <span className="fl-row-main">
        <span className="fl-row-top">
          {!flag.resolved && <Severity level={flag.severity} />}
          <span className="fl-row-where">{flag.where}</span>
        </span>
        <span className="fl-row-title">{flag.title}</span>
      </span>
      {!flag.resolved && <Icon name="chevron" size={16} className="fl-row-arr" />}
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
  // MessageCard is remounted (keyed by flag id) whenever the selected flag
  // changes, so these initialize fresh from props without a reset effect.
  const [body, setBody] = useState(flag.message.body);
  const [edited, setEdited] = useState(false);

  return (
    <div className="msg-card">
      <div className="msg-head">
        <AIChip tone="accent">Drafted message</AIChip>
        <span className="msg-meta">
          <span className="msg-chan">{flag.message.channel}</span>
          <span className="msg-to">to {flag.message.to}</span>
        </span>
      </div>
      <div className="msg-bubble">
        <textarea
          className="msg-text"
          value={body}
          rows={4}
          onChange={(e) => {
            setBody(e.target.value);
            setEdited(true);
          }}
        />
      </div>
      <div className="msg-foot">
        <span className="msg-note">
          {edited ? (
            <>
              <Icon name="check" size={13} stroke={2.2} /> edited by you
            </>
          ) : (
            flag.message.note
          )}
        </span>
      </div>
      <div className="msg-actions">
        <Button variant="primary" icon="send" onClick={onSend} disabled={busy} full>
          Approve &amp; send
        </Button>
        <Button variant="ghost" onClick={onApplyOnly} disabled={busy}>
          Apply without message
        </Button>
      </div>
    </div>
  );
}

function ResolvedPanel({ flag }: { flag: Flag }) {
  return (
    <div className="fl-resolved">
      <div className="fl-resolved-badge">
        <Icon name="check" size={30} stroke={2.4} />
      </div>
      <h3>Handled</h3>
      <p>{flag.suggestion}.</p>
      {flag.sent && (
        <div className="fl-resolved-sent">
          <Icon name="send" size={14} /> Message sent to {flag.message.to}
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
    <div className="fl-detail" key={flag.id}>
      <div className="fl-detail-head">
        <div className="fl-detail-where">
          <span className="fl-detail-ic" data-sev={flag.severity}>
            <Icon name={flag.icon} size={20} />
          </span>
          <div>
            <div className="fl-detail-where-t">{flag.where}</div>
            <Severity level={flag.severity} />
          </div>
        </div>
      </div>
      <h2 className="fl-detail-title">{flag.title}</h2>
      <p className="fl-detail-sum">{flag.summary}</p>

      <div className="fl-why">
        <span className="fl-why-l">Why it&apos;s flagged</span>
        <p>{flag.reason}</p>
      </div>

      <div className="fl-fix">
        <div className="fl-fix-head">
          <AIChip>Suggested fix</AIChip>
        </div>
        <div className="fl-fix-body">
          <Icon name="bolt" size={18} fill style={{ color: "var(--accent)", flexShrink: 0 }} />
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
      <ViewHead
        title="Needs you"
        sub={
          open.length === 0
            ? "Everything's running clean."
            : `${open.length} ${open.length === 1 ? "thing needs" : "things need"} a decision · auto-sorted by urgency`
        }
        right={
          <>
            <span className="live-dot">
              <span className="live-dot-i" /> Live
            </span>
            <span className="head-clock">{clock(nowMin)}</span>
          </>
        }
      />

      <div className="fl-wrap">
        <div className="fl-list">
          {open.length === 0 && (
            <div className="fl-allclear">
              <div className="fl-allclear-ic">
                <Icon name="check" size={26} stroke={2.4} />
              </div>
              <div>
                <div className="fl-allclear-t">All clear</div>
                <div className="fl-allclear-s">Nothing needs you right now.</div>
              </div>
            </div>
          )}
          {open.map((f) => (
            <FlagRow key={f.id} flag={f} active={f.id === sel} onClick={() => setSel(f.id)} />
          ))}
          {done.length > 0 && (
            <>
              <div className="fl-list-sect">Cleared · {done.length}</div>
              {done.map((f) => (
                <FlagRow key={f.id} flag={f} active={f.id === sel} onClick={() => setSel(f.id)} />
              ))}
            </>
          )}
        </div>

        <div className="fl-panel">
          {selected ? (
            <Detail flag={selected} />
          ) : (
            <div className="fl-empty">
              <div className="fl-empty-ic">
                <Icon name="shuttle" size={34} />
              </div>
              <p>You&apos;re all caught up.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
