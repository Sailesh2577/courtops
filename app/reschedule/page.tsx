import { ViewHead } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export default function ReschedulePage() {
  return (
    <div className="view">
      <ViewHead title="Reschedule" sub="Replan the day when it drifts." />
      <EmptyState
        icon="refresh"
        title="Reschedule coming in Phase 1"
        sub="A proposed replan shown as before→after time/court chips, guardrail checks, an impact summary, and one message to all affected players."
      />
    </div>
  );
}
