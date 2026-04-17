import { Countdown } from "./countdown";

const MARQUEE_WORDS = [
  "Na palube",
  "Katamarán",
  "Split · HR",
  "Jadran",
  "Proviant",
  "Kamarátstvo",
  "Teambuilding · MMXXVI",
  "Viedeň → Split",
];

export default function Page() {
  return (
    <main className="grain vignette relative min-h-svh overflow-hidden">
      <CornerBrackets />

      {/* Masthead */}
      <header className="relative z-10 mx-5 pt-5 md:mx-10 md:pt-8">
        <div className="h-px bg-ink/80" />
        <div className="flex items-center justify-between gap-4 py-3 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-ink md:text-[0.7rem] md:tracking-[0.32em]">
          <span>Vydanie · MMXXVI</span>
          <span className="hidden text-stone md:inline">
            Teambuildingový Denník — Zväzok II, Č. 1
          </span>
          <span>Viedeň ✈ Split · HR</span>
        </div>
        <div className="h-px bg-ink/80" />
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-5 mt-10 md:mx-10 md:mt-20">
        <div className="flex items-start justify-between gap-6">
          <p
            className="rise font-editorial text-xl italic text-vermilion md:text-3xl"
            style={{ animationDelay: "80ms" }}
          >
            — odpočet do
          </p>
          <div
            className="rise hidden flex-col items-end gap-1 font-mono text-[0.65rem] uppercase tracking-[0.32em] text-stone md:flex"
            style={{ animationDelay: "180ms" }}
          >
            <span>↗ poznač si dátum</span>
            <span className="text-ink">27 · vi · 2026</span>
          </div>
        </div>

        <h1
          className="rise mt-1 font-display text-[clamp(4rem,19vw,17rem)] italic leading-[0.82] tracking-[-0.03em] text-ink md:mt-2"
          style={{ animationDelay: "140ms" }}
        >
          Teambuilding
          <span className="ml-3 align-baseline font-editorial not-italic text-[0.28em] text-vermilion md:ml-6">
            Vol. II
          </span>
        </h1>

        <div
          className="rise mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-ink md:mt-7 md:text-[0.72rem] md:tracking-[0.34em]"
          style={{ animationDelay: "220ms" }}
        >
          <span>Viedeň</span>
          <span className="text-vermilion">✈</span>
          <span>Split</span>
          <span className="text-vermilion">⚓</span>
          <span>Katamarán</span>
          <span className="text-vermilion">⌘</span>
          <span>Jadran</span>
        </div>

        <div
          className="rise mt-5 flex flex-wrap items-end justify-between gap-6 md:mt-8"
          style={{ animationDelay: "300ms" }}
        >
          <p className="max-w-2xl font-editorial text-xl text-stone md:text-3xl">
            <span className="italic text-ink">dvadsiateho siedmeho</span> júna,
            dvetisícdvadsaťšesť · z Viedne letecky do Splitu, odtiaľ na
            katamarán po Jadrane — zraz na mori.
          </p>
          <Compass />
        </div>
      </section>

      {/* Countdown */}
      <section
        className="rise relative z-10 mx-5 mt-12 md:mx-10 md:mt-20"
        style={{ animationDelay: "420ms" }}
      >
        <div className="mb-3 flex items-end justify-between">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-vermilion md:text-[0.7rem]">
            <span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-vermilion align-middle" />
            ostáva
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-stone md:text-[0.7rem]">
            naživo · tiká
          </span>
        </div>
        <Countdown />
        <div className="mt-3 flex items-center justify-between font-mono text-[0.55rem] uppercase tracking-[0.28em] text-stone md:text-[0.65rem]">
          <span>čas · lokálny</span>
          <span>↺ obnova každú sekundu</span>
        </div>
      </section>

      {/* Footer marquee */}
      <section className="relative z-10 mt-16 border-t border-ink/80 md:mt-24">
        <div className="overflow-hidden border-b border-ink/80">
          <div className="marquee-track flex whitespace-nowrap py-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <ul
                key={i}
                aria-hidden={i === 1}
                className="flex shrink-0 items-center"
              >
                {MARQUEE_WORDS.map((w) => (
                  <li
                    key={`${i}-${w}`}
                    className="mx-8 flex items-center gap-8 font-display text-3xl italic text-ink/85 md:mx-12 md:gap-12 md:text-5xl"
                  >
                    {w}
                    <span className="text-vermilion">✦</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <div className="mx-5 flex items-center justify-between py-4 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-stone md:mx-10 md:text-[0.65rem]">
          <span>folio · ii</span>
          <span className="hidden md:inline">
            ručne sadzané · tlačené na teplom papieri
          </span>
          <span>№ 027 / 06 / 26</span>
        </div>
      </section>
    </main>
  );
}

function CornerBrackets() {
  const corners = [
    "top-3 left-3 border-t border-l",
    "top-3 right-3 border-t border-r",
    "bottom-3 left-3 border-b border-l",
    "bottom-3 right-3 border-b border-r",
  ];
  return (
    <>
      {corners.map((c) => (
        <div
          key={c}
          className={`pointer-events-none absolute ${c} z-20 h-5 w-5 border-ink/70 md:h-7 md:w-7`}
        />
      ))}
    </>
  );
}

function Compass() {
  const ticks = Array.from({ length: 24 });
  return (
    <div className="relative shrink-0 text-ink">
      <svg
        className="slow-spin"
        width="96"
        height="96"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
      >
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="0.3" />
        {ticks.map((_, i) => {
          const a = (i * Math.PI * 2) / ticks.length - Math.PI / 2;
          const major = i % 6 === 0;
          const r1 = 41;
          const r2 = major ? 33 : 38;
          const x1 = 50 + Math.cos(a) * r1;
          const y1 = 50 + Math.sin(a) * r1;
          const x2 = 50 + Math.cos(a) * r2;
          const y2 = 50 + Math.sin(a) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={major ? 0.9 : 0.4}
            />
          );
        })}
        <path
          d="M 50 16 L 55 50 L 50 84 L 45 50 Z"
          fill="var(--color-vermilion)"
        />
        <circle cx="50" cy="50" r="2.2" fill="currentColor" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[0.5rem] uppercase tracking-[0.3em] text-ink/60">
        S
      </span>
    </div>
  );
}
