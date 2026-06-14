"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Toasts } from "./Toasts";

type Theme = "light" | "dark";

// The persistent app chrome shared by every screen: sidebar + scrolling main +
// toast layer. Owns the light/dark theme (default light; dark is an opt-in
// toggle, persisted to localStorage). The actual data-theme attribute lives on
// <html> and is set pre-paint by the inline script in layout.tsx — here we just
// keep React's state in sync with it.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = usePathname();

  useEffect(() => {
    // Sync React state with the theme the inline script may have set on <html>
    // before hydration. SSR/first render must default to "light" to avoid a
    // hydration mismatch, so this post-mount catch-up is deliberate.
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("courtops-theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="app">
      <Sidebar theme={theme} onToggleTheme={toggleTheme} />
      <main className="main">
        {/* key by pathname so the view-enter animation replays on navigation */}
        <div className="main-scroll" key={pathname}>
          {children}
        </div>
      </main>
      <Toasts />
    </div>
  );
}
