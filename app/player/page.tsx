import { ViewHead } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export default function PlayerPage() {
  return (
    <div className="view">
      <ViewHead title="Player view" sub="The player's phone — live-synced to the organizer's actions." />
      <EmptyState
        icon="player"
        title="Player view coming in Phase 1"
        sub="A lightweight 'my next match' phone screen that updates the instant the organizer acts — court number, rough start time, and a warm-up nudge."
      />
    </div>
  );
}
