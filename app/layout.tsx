import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

// One typeface across the whole product: Hanken Grotesk, self-hosted by
// next/font. It is a variable font, so we omit `weight` to get the full
// 400–800 range. Numbers use its tabular figures (font-variant-numeric) so
// timers and scores stay aligned; we deliberately do not ship a second
// (mono) family. --font-mono is aliased to this in globals.css for any older
// rules that still reference it.
const sans = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CourtOps — Tournament-day operations",
  description:
    "Live tournament-day operations for racquet-sport organizers: which court is free, who plays next, what's running behind, and who to message.",
};

// Set the theme on <html> before first paint so returning dark-mode users
// don't see a light flash. Default is light when nothing is stored.
const themeScript = `(function(){try{var t=localStorage.getItem('courtops-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={sans.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* suppressHydrationWarning: some browser extensions (e.g. Grammarly)
          inject attributes on <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
