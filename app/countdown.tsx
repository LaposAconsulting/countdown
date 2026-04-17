"use client";

import { useEffect, useState } from "react";

// Teambuilding · 27. jún 2026 · 00:00 CEST (UTC+2)
const TARGET = new Date("2026-06-27T00:00:00+02:00").getTime();

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function computeDiff(): TimeLeft {
  const ms = Math.max(0, TARGET - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
  };
}

const pad = (n: number, w = 2) => n.toString().padStart(w, "0");

export function Countdown() {
  const [t, setT] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setT(computeDiff());
    const id = setInterval(() => setT(computeDiff()), 1000);
    return () => clearInterval(id);
  }, []);

  const cells = [
    { label: "dní", value: t ? pad(t.days, 2) : "––" },
    { label: "hod", value: t ? pad(t.hours) : "––" },
    { label: "min", value: t ? pad(t.minutes) : "––" },
    { label: "sek", value: t ? pad(t.seconds) : "––" },
  ];

  return (
    <div className="flex w-full items-start justify-center gap-10 xl:gap-16 2xl:gap-24">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center">
          <span
            key={c.value}
            className="tick-in font-display tabular-nums leading-[0.82] tracking-[-0.055em] text-foam drop-shadow-[0_10px_60px_rgba(0,0,0,0.6)] text-[clamp(8rem,20vw,22rem)]"
          >
            {c.value}
          </span>
          <span className="mt-5 font-mono uppercase tracking-[0.5em] text-mist text-[clamp(0.8rem,1vw,1.15rem)]">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
