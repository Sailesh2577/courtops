"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { LogoMark } from "./Logo";
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

// The six primary surfaces, in priority order.
const NAV: NavItem[] = [
  { label: "Needs you", href: "/needs-you", icon: "flag", badge: true },
  { label: "Court board", href: "/board", icon: "grid" },
  { label: "Delay radar", href: "/radar", icon: "signal", dot: true },
  { label: "Schedule", href: "/schedule", icon: "calendar" },
  { label: "Reschedule", href: "/reschedule", icon: "refresh" },
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
  const resetDemo = useStore((s) => s.resetDemo);
  const openCount = flags.filter((f) => !f.resolved).length;
  const delayActive = !flags.find((f) => f.id === "f2")?.resolved;

  // Prefer the configured display name; fall back to the part before the @.
  const orgName = DEMO_ORG.name || user?.email?.split("@")[0] || "Organizer";

  // The reset is a two-click confirm so it can't fire by accident: the first
  // click arms it for a few seconds, the second runs it.
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleReset() {
    if (!armed) {
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(false);
    void resetDemo();
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark">
          <LogoMark size={20} />
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

        {user && (
          <button
            className={"demo-reset" + (armed ? " is-armed" : "")}
            onClick={handleReset}
            aria-label="Reset the demo to the seed tournament"
          >
            <Icon name="refresh" size={15} />
            {armed ? "Click again to confirm" : "Reset demo"}
          </button>
        )}

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
