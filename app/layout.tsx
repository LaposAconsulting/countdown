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
        {/* Safety net: if the inline JS ticker doesn't run on the TV,
            re-fetch the page every 30s to pick up fresh server-rendered values. */}
        <meta httpEquiv="refresh" content="30" />
      </head>
      <body>{children}</body>
    </html>
  );
}
