import { ViewHead } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export default function BoardPage() {
  return (
    <div className="view">
      <ViewHead title="Court board" sub="Live status of every court at a glance." />
      <EmptyState
        icon="grid"
        title="Court board coming in Phase 1"
        sub="A 3-column grid of all nine courts with ticking match timers, scores, and inline quick-actions on flagged courts."
      />
    </div>
  );
}
