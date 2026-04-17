import { Countdown } from "./countdown";

const STARS = Array.from({ length: 52 }, (_, i) => ({
  x: ((i * 73) % 1000) / 10,
  y: ((i * 149) % 560) / 10,
  s: 1 + (i % 3),
  d: (i * 0.27) % 4,
  o: 0.35 + ((i * 17) % 60) / 100,
}));

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-hidden">
      <SeaScape />

      <div className="relative z-10 flex min-h-svh flex-col">
        {/* Top bar — tiny */}
        <header className="mx-5 pt-5 md:mx-10 md:pt-7">
          <div className="flex items-center justify-between gap-4 font-mono text-[0.58rem] uppercase tracking-[0.34em] text-foam/75 md:text-[0.7rem] md:tracking-[0.38em]">
            <span>Viedeň ✈ Split · HR</span>
            <span>27 · 06 · 2026</span>
          </div>
          <div className="mt-3 h-px bg-foam/25" />
        </header>

        {/* Hero — countdown is the hero */}
        <section className="flex flex-1 flex-col items-center justify-center px-4 pb-[24vh] md:px-10 md:pb-[18vh]">
          <p
            className="rise font-mono text-[0.6rem] uppercase tracking-[0.42em] text-foam/70 md:text-[0.78rem] md:tracking-[0.5em]"
            style={{ animationDelay: "80ms" }}
          >
            Teambuilding <span className="text-sunset">Vol. II</span>
          </p>

          <div
            className="rise mt-6 w-full md:mt-10"
            style={{ animationDelay: "200ms" }}
          >
            <Countdown />
          </div>
        </section>
      </div>
    </main>
  );
}

function SeaScape() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Sky → horizon → sea gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #061529 0%, #0a2140 34%, #2b3a5f 60%, #6b4a62 70%, #c56c4e 76%, #f08049 79%, #ffcf73 82%, #1e587f 84%, #0f3e68 90%, #041525 100%)",
        }}
      />

      {/* Stars */}
      <div className="absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="twinkle absolute rounded-full bg-foam"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              animationDelay: `${s.d}s`,
              opacity: s.o,
            }}
          />
        ))}
      </div>

      {/* Sun glow halo */}
      <div className="absolute left-1/2 top-[80%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="sun-pulse h-[420px] w-[420px] rounded-full md:h-[560px] md:w-[560px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,207,115,0.85) 0%, rgba(240,128,73,0.45) 28%, rgba(240,128,73,0.15) 50%, transparent 72%)",
            filter: "blur(6px)",
          }}
        />
      </div>

      {/* Sun disc */}
      <div className="absolute left-1/2 top-[81%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-[78px] w-[78px] rounded-full md:h-[110px] md:w-[110px]"
          style={{
            background:
              "radial-gradient(circle at 45% 40%, #fff0c4 0%, #ffcf73 45%, #f5a454 100%)",
            boxShadow: "0 0 60px rgba(255,196,110,0.55)",
          }}
        />
      </div>

      {/* Distant islands */}
      <svg
        className="absolute inset-x-0 top-[82.4%] h-[4%] w-full"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
      >
        <path
          d="M0 55 L90 42 L160 50 L230 30 L340 48 L430 38 L540 52 L640 30 L760 48 L860 42 L970 50 L1060 36 L1200 50 L1200 60 L0 60 Z"
          fill="#071a33"
          opacity="0.85"
        />
      </svg>

      {/* Waves */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] md:h-[32%]">
        {/* Far wave */}
        <div className="wave-c absolute inset-x-0 bottom-[58%] h-[55%] opacity-55">
          <svg
            className="h-full w-[200%]"
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0 60 C200 20, 400 100, 600 60 C800 20, 1000 100, 1200 60 C1400 20, 1600 100, 1800 60 C2000 20, 2200 100, 2400 60 L2400 200 L0 200 Z"
              fill="#0e3a5c"
            />
          </svg>
        </div>
        {/* Mid wave */}
        <div className="wave-b absolute inset-x-0 bottom-[28%] h-[60%] opacity-85">
          <svg
            className="h-full w-[200%]"
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0 80 C180 40, 360 130, 600 80 C840 30, 1020 130, 1200 80 C1380 30, 1560 130, 1800 80 C2040 30, 2220 130, 2400 80 L2400 200 L0 200 Z"
              fill="#082944"
            />
          </svg>
        </div>
        {/* Front wave */}
        <div className="wave-a absolute inset-x-0 bottom-0 h-[55%]">
          <svg
            className="h-full w-[200%]"
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0 90 C160 40, 320 140, 600 90 C880 40, 1040 140, 1200 90 C1360 40, 1520 140, 1800 90 C2080 40, 2240 140, 2400 90 L2400 200 L0 200 Z"
              fill="#03111f"
            />
          </svg>
        </div>
      </div>

      {/* Catamaran */}
      <div
        className="bob absolute left-[36%] top-[82.5%] md:left-[42%]"
        style={{ transform: "translate(-50%, 0)" }}
      >
        <Catamaran />
      </div>

      {/* Grain */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.28 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "260px 260px",
        }}
      />
    </div>
  );
}

function Catamaran() {
  return (
    <svg
      width="78"
      height="62"
      viewBox="0 0 220 180"
      fill="#020a16"
      className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] md:h-[78px] md:w-[98px]"
      aria-hidden
    >
      {/* main sail */}
      <path d="M110 18 L110 118 L182 118 Z" />
      {/* jib */}
      <path d="M110 36 L110 112 L62 112 Z" />
      {/* mast */}
      <rect x="109" y="18" width="2.2" height="104" />
      {/* tramp / cross beam */}
      <path d="M48 124 L196 124 L188 130 L56 130 Z" opacity="0.85" />
      {/* left hull */}
      <path d="M30 130 Q62 138 102 134 L102 146 Q60 150 26 142 Z" />
      {/* right hull */}
      <path d="M118 134 Q158 138 196 130 L198 142 Q158 150 120 146 Z" />
    </svg>
  );
}
