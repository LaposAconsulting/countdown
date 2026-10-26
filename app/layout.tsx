import type { Metadata } from "next";
import "./globals.css";
import { isVideoMode, videoPeriodMs } from "./video-mode";

export const metadata: Metadata = {
  title: "Odpočet — Husacina & GTA VI",
  description:
    "Odpočet do husaciny (3. december 2026, 18:00) a vydania GTA VI (19. november 2026).",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const video = await isVideoMode();
  return (
    <html lang="sk">
      <head>
        {/* Safety net: if inline ES5 ticker doesn't run on the TV,
            re-fetch the page every 30s so values stay in sync.
            In video mode the reload IS the scheduler: one reload per period
            (env VIDEO_EVERY_MIN, default 5 min), each load autoplays the video
            once (see app/video-mode.ts). */}
        <meta
          httpEquiv="refresh"
          content={video ? String(videoPeriodMs() / 1000) : "30"}
        />
        {/* Google Fonts — served as WOFF for old UAs, with strong serif/mono
            fallbacks in CSS so the page still looks right if fonts fail. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500;700&family=Oswald:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* className is toggled imperatively (`video-on`) by the ES5 video script
          before React hydrates — don't reconcile it. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
