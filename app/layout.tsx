import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teambuilding Vol. II — 27. jún 2026",
  description:
    "Odpočet do druhého teambuildingu — 27. jún 2026. Viedeň → Split, katamarán po Jadrane.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <head>
        {/* Safety net: if inline ES5 ticker doesn't run on the TV,
            re-fetch the page every 30s so values stay in sync. */}
        <meta httpEquiv="refresh" content="30" />
        {/* Google Fonts — served as WOFF for old UAs, with strong serif/mono
            fallbacks in CSS so the page still looks right if fonts fail. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
