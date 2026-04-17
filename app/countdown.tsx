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
    <div className="flex w-full items-start justify-center gap-1 md:gap-3">
      {cells.map((c, i) => (
        <div key={c.label} className="contents">
          <div className="flex flex-col items-center">
            <span
              key={c.value}
              className="tick-in font-display tabular-nums leading-[0.82] tracking-[-0.045em] text-[clamp(3.8rem,20vw,17rem)] text-foam drop-shadow-[0_6px_36px_rgba(0,0,0,0.55)]"
            >
              {c.value}
            </span>
            <span className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.34em] text-mist md:mt-4 md:text-[0.78rem] md:tracking-[0.38em]">
              {c.label}
            </span>
          </div>
          {i < cells.length - 1 && (
            <span className="self-start pt-[0.08em] font-display leading-[0.82] tracking-[-0.045em] text-[clamp(2.6rem,12vw,10rem)] text-sunset/85">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
