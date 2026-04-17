import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teambuilding Vol. II — 27. jún 2026 · Katamarán, Split",
  description:
    "Odpočet do druhého teambuildingu — dvadsiateho siedmeho júna, dvetisíc dvadsaťšesť. Z Viedne letecky do Splitu, potom na katamarán po Jadrane.",
};

export const viewport: Viewport = {
  themeColor: "#f3ede1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="sk"
      className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
