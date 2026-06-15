"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { Avatar } from "./ui";
import { useStore } from "@/lib/store";
import { EVENT } from "@/lib/data";
import { DEMO_ORG } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  badge?: boolean; // shows the live open-flag count
  dot?: boolean; // shows the Court-1 delay ping while it is unresolved
};

// Order & icons per the design handoff (02-components.md §Sidebar).
const NAV: NavItem[] = [
  { label: "Needs you", href: "/needs-you", icon: "flag", badge: true },
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
  const router = useRouter();
  const flags = useStore((s) => s.flags);
  const user = useStore((s) => s.user);
  const signOut = useStore((s) => s.signOut);
  const openCount = flags.filter((f) => !f.resolved).length;
  const delayActive = !flags.find((f) => f.id === "f2")?.resolved;

  // Prefer the configured display name; fall back to the part before the @.
  const orgName = DEMO_ORG.name || user?.email?.split("@")[0] || "Organizer";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

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
              {n.badge && openCount > 0 ? (
                <span className="nav-badge">{openCount}</span>
              ) : null}
              {n.dot && delayActive ? <span className="nav-dot" /> : null}
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
          <div className="event-card-name">{EVENT.name}</div>
          <div className="event-card-meta">Sat · Badminton · {EVENT.courts} courts</div>
        </div>

        <div className="org">
          <Avatar name={orgName} size={30} />
          <div className="org-meta">
            <span className="org-name">{orgName}</span>
            <span className="org-role">{user?.email ?? "Organizer"}</span>
          </div>
          <button
            className="org-out"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
