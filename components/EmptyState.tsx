import { Icon, type IconName } from "./Icon";

// Placeholder shown on screens not built yet (Phase 0). Replaced by the real
// screen content in Phase 1.
export function EmptyState({
  icon = "shuttle",
  title,
  sub,
}: {
  icon?: IconName;
  title: string;
  sub?: string;
}) {
  return (
    <div className="empty">
      <Icon name={icon} size={40} stroke={1.4} className="empty-ic" />
      <div className="empty-t">{title}</div>
      {sub && <div className="empty-s">{sub}</div>}
    </div>
  );
}
