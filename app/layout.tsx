import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

// Hanken Grotesk (UI) + JetBrains Mono (timers/scores/stats), self-hosted by
// next/font and exposed as the CSS variables our tokens reference. Both are
// variable fonts, so we omit `weight` to get the full 400–800 range.
const sans = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});
const mono = JetBrains_Mono({
  variable: "--font-mono",
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
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
