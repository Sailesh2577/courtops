"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { Avatar } from "./ui";

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  badge?: number; // open-flag count (static placeholder until the store lands)
  dot?: boolean; // unresolved Court-1 delay ping
};

// Order & icons per the design handoff (02-components.md §Sidebar).
const NAV: NavItem[] = [
  { label: "Needs you", href: "/needs-you", icon: "flag", badge: 3 },
  { label: "Court board", href: "/board", icon: "grid" },
  { label: "Schedule", href: "/schedule", icon: "calendar" },
  { label: "Reschedule", href: "/reschedule", icon: "refresh", dot: true },
  { label: "Player view", href: "/player", icon: "player" },
];

export function Sidebar({
  theme,
  onToggleTheme,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="shuttle" size={20} />
        </span>
        <span className="brand-name">CourtOps</span>
      </div>

      <nav className="nav">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={"nav-item" + (active ? " nav-on" : "")}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={n.icon} size={19} />
              <span className="nav-label">{n.label}</span>
              {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
              {n.dot ? <span className="nav-dot" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="side-foot">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>

        <div className="event-card">
          <div className="event-card-name">Nebraska Open</div>
          <div className="event-card-meta">Sat · Badminton · 9 courts</div>
        </div>

        <div className="org">
          <Avatar name="Sailesh P" size={30} />
          <div className="org-meta">
            <span className="org-name">Sailesh P.</span>
            <span className="org-role">Organizer</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
