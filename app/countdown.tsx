"use client";

import { useEffect, useState } from "react";

// Teambuilding · 27 June 2026 · 00:00 CEST (UTC+2)
const TARGET = new Date("2026-06-27T00:00:00+02:00").getTime();

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function computeDiff(): TimeLeft {
  const ms = TARGET - Date.now();
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
    done: false,
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
    { label: "Dní", value: t ? pad(t.days, 2) : "––" },
    { label: "Hodín", value: t ? pad(t.hours) : "––" },
    { label: "Minút", value: t ? pad(t.minutes) : "––" },
    { label: "Sekúnd", value: t ? pad(t.seconds) : "––" },
  ];

  return (
    <div className="border-y border-ink/70 bg-paper/30">
      <div className="grid grid-cols-4 divide-x divide-ink/25">
        {cells.map((c) => (
          <div
            key={c.label}
            className="relative flex flex-col items-center justify-center gap-2 px-1 py-6 md:px-4 md:py-10"
          >
            <span
              key={c.value}
              className="tick-in font-display text-[clamp(2.4rem,12.5vw,10rem)] leading-[0.82] tracking-[-0.03em] tabular-nums"
            >
              {c.value}
            </span>
            <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-stone md:text-[0.7rem] md:tracking-[0.32em]">
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
