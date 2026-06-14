"use client";

// Temporary Phase 0 showcase so we can confirm every primitive renders
// correctly in both light and dark. Delete once the real screens exist.
import { useToasts } from "@/lib/store";
import {
  Button,
  Avatar,
  StatusDot,
  Pill,
  Severity,
  AIChip,
  Stat,
} from "./ui";

export function PrimitivesGallery() {
  const pushToast = useToasts((s) => s.pushToast);

  return (
    <div className="gallery">
      <div className="gallery-card">
        <h3>Buttons</h3>
        <div className="gallery-row">
          <Button variant="primary" icon="send">
            Approve &amp; send
          </Button>
          <Button variant="soft" icon="bolt">
            Suggested fix
          </Button>
          <Button variant="ghost" icon="x">
            Dismiss
          </Button>
          <Button variant="primary" size="sm" icon="check">
            Small
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </div>

      <div className="gallery-card">
        <h3>Status &amp; severity</h3>
        <div className="gallery-row">
          <Pill status="live" soft />
          <Pill status="ready" soft />
          <Pill status="warming" soft />
          <Pill status="idle" soft />
          <Pill status="done" soft />
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <StatusDot status="live" pulse /> live dot
          </span>
          <Severity level="high" />
          <Severity level="medium" />
          <Severity level="low" />
        </div>
      </div>

      <div className="gallery-card">
        <h3>Avatars &amp; AI chip</h3>
        <div className="gallery-row">
          <Avatar name="Aanya Rao" />
          <Avatar name="Wei Chen" accent />
          <Avatar name="Maya Lin" size={40} />
          <AIChip />
          <AIChip tone="accent">Suggested fix</AIChip>
        </div>
      </div>

      <div className="gallery-card">
        <h3>Stats</h3>
        <div className="gallery-row" style={{ gap: 40 }}>
          <Stat label="Court usage" value="67%" accent />
          <Stat label="Avg idle" value="54m" sub="was 92m" />
          <Stat label="On time" value="50%" />
        </div>
      </div>

      <div className="gallery-card">
        <h3>Toasts</h3>
        <div className="gallery-row">
          <Button
            variant="soft"
            icon="check"
            onClick={() =>
              pushToast({
                title: "Message sent · flag cleared",
                body: "Aanya Rao notified — Court 3 is now live.",
              })
            }
          >
            Trigger a toast
          </Button>
        </div>
      </div>
    </div>
  );
}
