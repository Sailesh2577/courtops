"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Toasts } from "./Toasts";
import { useStore } from "@/lib/store";
import { isPublicRoute } from "@/lib/auth";

type Theme = "light" | "dark";

// The persistent app chrome shared by every screen: sidebar + scrolling main +
// toast layer. Owns the light/dark theme (default light; dark is an opt-in
// toggle, persisted to localStorage). The actual data-theme attribute lives on
// <html> and is set pre-paint by the inline script in layout.tsx — here we just
// keep React's state in sync with it.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = usePathname();
  const router = useRouter();
  const tick = useStore((s) => s.tick);
  const init = useStore((s) => s.init);
  const user = useStore((s) => s.user);
  const authReady = useStore((s) => s.authReady);

  // The login screen and the player phone are open to everyone; every other
  // screen is an organizer surface and needs a signed-in session.
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const gated = !isPublicRoute(pathname);

  // Load the tournament from Supabase and restore any session once on mount.
  // Until this resolves the screens render the seed state, which matches the
  // database, so there is no loading flash.
  useEffect(() => {
    void init();
  }, [init]);

  // Send signed-out visitors away from organizer surfaces to the login screen.
  useEffect(() => {
    if (authReady && gated && !user) router.replace("/login");
  }, [authReady, gated, user, router]);

  // Advance the elapsed timers on every live match once a second. One interval
  // for the whole app; the board and player view read the result from the store.
  useEffect(() => {
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [tick]);

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

  // The login screen stands alone, with no organizer chrome around it.
  if (isLogin) {
    return (
      <>
        {children}
        <Toasts />
      </>
    );
  }

  // On organizer surfaces, hold the screen until auth resolves so we never flash
  // the dashboard to a signed-out visitor before redirecting them to login.
  if (gated && (!authReady || !user)) {
    return <div className="auth-hold" aria-busy="true" />;
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
