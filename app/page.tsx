import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";

// The public landing page. Login and Sign up both lead to the organizer
// sign-in (CourtOps runs on a single seeded organizer account), and the player
// view is one click away for anyone who just wants to see their next match.

const COURTS = [
  { n: 1, state: "live" },
  { n: 2, state: "ready" },
  { n: 3, state: "open" },
  { n: 4, state: "live" },
  { n: 5, state: "idle" },
  { n: 6, state: "live" },
  { n: 7, state: "idle" },
  { n: 8, state: "ready" },
  { n: 9, state: "live" },
] as const;

const FEATURES = [
  {
    title: "Operate by exception",
    body: "The home screen is what needs you, ranked by the cost of waiting, not a wall of everything. The headline number is fixes per hour.",
  },
  {
    title: "One action, everything updates",
    body: "Free a court and the floor plan, the schedule, and the affected player's phone all move together. One state, two surfaces, live.",
  },
  {
    title: "AI suggests, a person decides",
    body: "Ask in plain language and get a typed plan to approve. The copilot and the delay radar propose. Nothing changes until you say so.",
  },
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Logo size={32} />
        <nav className="lp-nav-actions">
          <Link href="/login" className="lp-link">
            Log in
          </Link>
          <Link href="/login" className="sw-btn lp-nav-cta">
            Sign up
          </Link>
        </nav>
      </header>

      <main className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">Tournament-day operations</span>
          <h1 className="lp-h1">Run the day, not just the draw.</h1>
          <p className="lp-sub">
            CourtOps is the live operations tool for racquet-sport organizers. It
            runs the day-of logistics that bracket software ignores: which court
            is free, who plays next, what is running behind, and who to message
            about it.
          </p>
          <div className="lp-hero-actions">
            <Link href="/login" className="sw-btn">
              Log in
            </Link>
            <Link href="/login" className="sw-btn-ghost">
              Sign up
            </Link>
          </div>
          <Link href="/player" className="lp-player-link">
            Or open the player view &rarr;
          </Link>
        </div>

        <div className="lp-hero-art" aria-hidden="true">
          <div className="lp-art-stat">
            <span className="lp-art-stat-l">Fixes / hr</span>
            <span className="lp-art-stat-v">12</span>
          </div>
          <div className="lp-art-grid">
            {COURTS.map((c) => (
              <div key={c.n} className={`lp-court lp-court--${c.state}`}>
                <span className="lp-court-n">C{c.n}</span>
                {c.state === "open" && (
                  <span className="lp-court-tag">Open</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <section className="lp-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="lp-feat">
            <h3 className="lp-feat-t">{f.title}</h3>
            <p className="lp-feat-b">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="lp-foot">
        <span className="lp-foot-brand">
          <LogoMark size={18} />
          CourtOps
        </span>
        <span className="lp-foot-note">A live tournament-day operations demo.</span>
      </footer>
    </div>
  );
}
