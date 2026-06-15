"use client";

// The operator copilot, as a global command bar. Open it with Cmd/Ctrl-K from
// any organizer screen. Type a plain-language request ("Court 5 is open, who
// goes on?"). It posts the request plus a snapshot of the live state to
// /api/copilot, which asks Gemini for a PLAN. The plan is shown for approval;
// nothing changes until the organizer clicks Approve, which hands the plan to
// the store. This is the "AI suggests, a person decides" moment, made general.

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { useStore } from "@/lib/store";
import { makeSnapshot, type CopilotAction, type CopilotPlan } from "@/lib/copilot";

const EXAMPLES = [
  "Court 5 is open, who should go on next?",
  "Tell Aanya she's up next",
  "Court 1 is running way over plan, what do I do?",
];

const STEP_ICON: Record<CopilotAction["kind"], IconName> = {
  assign_court: "court",
  send_message: "send",
  resolve_flag: "check",
  move_block: "calendar",
};

type Phase = "input" | "loading" | "plan" | "error";

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [command, setCommand] = useState("");
  const [plan, setPlan] = useState<CopilotPlan | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const applyPlan = useStore((s) => s.applyPlan);

  // Cmd/Ctrl-K toggles the bar; Esc closes it. Opening resets to a clean input.
  // These setState calls run from an event callback (not an effect body), so
  // they don't cascade renders.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          setPhase("input");
          setCommand("");
          setPlan(null);
          setError("");
          setOpen(true);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the field once the overlay is open and painted.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  async function run(text: string) {
    const cmd = text.trim();
    if (!cmd) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          snapshot: makeSnapshot(useStore.getState()),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The copilot couldn't respond.");
        setPhase("error");
        return;
      }
      setPlan(data.plan as CopilotPlan);
      setPhase("plan");
    } catch {
      setError("Couldn't reach the copilot. Check your connection.");
      setPhase("error");
    }
  }

  async function approve() {
    if (!plan) return;
    await applyPlan(plan);
    setOpen(false);
  }

  if (!open) return null;

  const empty = phase === "plan" && plan && plan.steps.length === 0;

  return (
    <div className="cb-overlay" onMouseDown={() => setOpen(false)}>
      <div className="cb-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cb-head">
          <span className="cb-ai">
            <Icon name="sparkle" size={15} /> Copilot
          </span>
          <span className="cb-hint">esc to close</span>
        </div>

        <form
          className="cb-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(command);
          }}
        >
          <Icon name="arrow" size={16} className="cb-arrow" />
          <input
            ref={inputRef}
            className="cb-input"
            placeholder="Ask CourtOps to fix something..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={phase === "loading"}
          />
          {command.trim() && phase !== "loading" && (
            <button className="cb-run" type="submit">
              Plan
            </button>
          )}
        </form>

        <div className="cb-body">
          {phase === "input" && (
            <div className="cb-examples">
              <div className="cb-examples-l">Try</div>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="cb-chip"
                  onClick={() => {
                    setCommand(ex);
                    run(ex);
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {phase === "loading" && (
            <div className="cb-loading">
              <span className="cb-dots">
                <i />
                <i />
                <i />
              </span>
              Reading the floor and drafting a plan...
            </div>
          )}

          {phase === "error" && (
            <div className="cb-error">
              <Icon name="x" size={15} /> {error}
            </div>
          )}

          {phase === "plan" && plan && (
            <div className="cb-plan">
              <div className="cb-plan-sum">{plan.summary}</div>
              {empty ? (
                <div className="cb-plan-empty">
                  No action to take from here.
                </div>
              ) : (
                <>
                  <ol className="cb-steps">
                    {plan.steps.map((s, i) => (
                      <li key={i} className="cb-step">
                        <span className="cb-step-ic">
                          <Icon name={STEP_ICON[s.kind]} size={15} />
                        </span>
                        <span className="cb-step-body">
                          <span className="cb-step-label">{s.label}</span>
                          {s.kind === "send_message" && (
                            <span className="cb-step-msg">
                              <span className="cb-step-to">
                                {s.channel} · to {s.to}
                              </span>
                              {s.body}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {plan.note && <div className="cb-plan-note">{plan.note}</div>}
                  <div className="cb-plan-actions">
                    <button className="cb-approve" onClick={approve}>
                      <Icon name="check" size={15} stroke={2.2} /> Approve plan
                    </button>
                    <button
                      className="cb-cancel"
                      onClick={() => setPhase("input")}
                    >
                      Discard
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
