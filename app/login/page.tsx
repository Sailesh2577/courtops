"use client";

// Organizer sign-in. CourtOps has two surfaces: the organizer dashboard (which
// writes the tournament) and the player phone (read only). Only the organizer
// authenticates; players never sign in. This is a portfolio demo with one
// seeded account, so the form pre-fills the demo credentials and a recruiter
// opening the live link can sign in with one click.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";
import { DEMO_ORG } from "@/lib/auth";

export default function LoginPage() {
  const signIn = useStore((s) => s.signIn);
  const user = useStore((s) => s.user);
  const authReady = useStore((s) => s.authReady);
  const router = useRouter();

  const [email, setEmail] = useState(DEMO_ORG.email);
  const [password, setPassword] = useState(DEMO_ORG.password);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip the form and go straight to the dashboard.
  useEffect(() => {
    if (authReady && user) router.replace("/needs-you");
  }, [authReady, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.replace("/needs-you");
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">
            <Icon name="shuttle" size={20} />
          </span>
          <span className="auth-brand-name">CourtOps</span>
        </div>

        <h1 className="auth-title">Organizer sign in</h1>
        <p className="auth-sub">
          The dashboard makes live changes to the tournament, so it needs an
          organizer account. The player view is open to everyone.
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <div className="auth-error">
              <Icon name="warm" size={14} />
              {error}
            </div>
          )}

          <button className="sw-btn sw-full" type="submit" disabled={busy}>
            {!busy && <Icon name="arrow" size={15} />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-demo">
          <span className="sw-ai">Demo</span>
          Credentials are pre-filled. Just press Sign in.
        </div>

        <Link href="/player" className="auth-player">
          <Icon name="player" size={14} />
          Open the player view instead
        </Link>
      </div>
    </div>
  );
}
