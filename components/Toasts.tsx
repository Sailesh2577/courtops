"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// Bottom-right toast stack. Auto-dismisses the latest toast after 4200ms
// (per the design handoff).
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toasts.length) return;
    const last = toasts[toasts.length - 1];
    const t = setTimeout(() => dismissToast(last.id), 4200);
    return () => clearTimeout(t);
  }, [toasts.length, toasts, dismissToast]);

  return (
    <div className="co-toasts">
      {toasts.map((t) => (
        <div key={t.id} className="co-toast">
          <span className="co-toast-ic">
            <Icon name="check" size={15} stroke={2.2} />
          </span>
          <div>
            <div className="co-toast-t">{t.title}</div>
            {t.body && <div className="co-toast-b">{t.body}</div>}
          </div>
          <button
            className="co-toast-x"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
