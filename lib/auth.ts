// Auth config for the organizer login.
//
// CourtOps has two surfaces: the organizer dashboard (writes the tournament)
// and the player phone (reads only). Only the organizer signs in. Players never
// authenticate; they read through row level security as the anon role.
//
// There is a single seeded organizer account, so the login page pre-fills these
// credentials and the live link can be explored in one click. The values can be
// overridden with NEXT_PUBLIC env vars; the fallbacks are the demo account
// created by `npm run seed:org`.

export const DEMO_ORG = {
  email: process.env.NEXT_PUBLIC_DEMO_ORG_EMAIL ?? "sailesh@courtops.demo",
  password: process.env.NEXT_PUBLIC_DEMO_ORG_PASSWORD ?? "courtops-demo",
  name: process.env.NEXT_PUBLIC_DEMO_ORG_NAME ?? "Sailesh P.",
};

// Public routes: the landing page, the player phone, and the login screen.
// Everything else is an organizer surface and requires a signed-in session
// (enforced in AppShell).
export const PUBLIC_ROUTES = ["/", "/login", "/player"];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}
