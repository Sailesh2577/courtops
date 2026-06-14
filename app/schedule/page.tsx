import { ViewHead } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export default function SchedulePage() {
  return (
    <div className="view">
      <ViewHead title="Schedule" sub="Court × time grid of match blocks." />
      <EmptyState
        icon="calendar"
        title="Schedule coming in Phase 1"
        sub="A court-by-time grid with a generate/stagger animation, a 'now' line, and an inline conflict fix."
      />
    </div>
  );
}
