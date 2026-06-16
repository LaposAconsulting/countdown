// Server-rendered countdown CAROUSEL for a 2014 Samsung TV browser.
// Zero modern JS / CSS features on the wire.
// Four slides rotate every ROTATE_MS (3 min). The active slide is picked
// deterministically from the clock (floor(now/ROTATE_MS) % N) so the rotation
// survives the layout.tsx <meta refresh=30> reload — no client state to lose.
// Initial values are SSR'd so the page works with JS disabled.
// A tiny ES5 ticker updates every countdown and swaps the active slide each second.

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ----- Carousel timing -----
const ROTATE_MS = 180000; // 3 minutes per slide
const GRID_MS = 300000; // 5 minutes for the grid (all-countdowns) view

// ----- Countdown targets -----
const TB_TARGET_MS = new Date("2026-06-27T00:00:00+02:00").getTime();   // Teambuilding Vol. II — Split
const NR_TARGET_MS = new Date("2026-09-05T20:00:00+02:00").getTime();   // Telekom Night Run — Bratislava
const GTA_TARGET_MS = new Date("2026-11-19T00:00:00+01:00").getTime();  // GTA VI release
const FABLE_OFFLINE_MS = new Date("2026-06-12T00:00:00+02:00").getTime(); // Fable 5 went offline — count UP

type Weather = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";
type SkyPhase = "night" | "dawn" | "day" | "dusk";

type CityConditions = {
  weather: Weather;
  temperature: number | null;
};

type Conditions = CityConditions & {
  sunriseH: number; // decimal hour, e.g. 5.7 for 05:42
  sunsetH: number;
  split: CityConditions;
};

function mapWeatherCode(code: number): Weather {
  if (code === 0) return "clear";
  if (code === 1) return "partly";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "clear";
}

function weatherLabel(w: Weather): string {
  switch (w) {
    case "clear": return "JASNO";
    case "partly": return "POLOJASNO";
    case "cloudy": return "OBLAČNO";
    case "fog": return "HMLA";
    case "rain": return "DÁŽĎ";
    case "snow": return "SNEH";
    case "storm": return "BÚRKA";
  }
}

function parseIsoHour(iso: string): number {
  // Open-Meteo returns "YYYY-MM-DDTHH:MM" already in the requested timezone.
  const t = iso.split("T")[1];
  if (!t) return 12;
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (isFinite(h) ? h : 0) + (isFinite(m) ? m / 60 : 0);
}

type OpenMeteoResp = {
  current_weather?: { weathercode?: number; temperature?: number };
  daily?: { sunrise?: string[]; sunset?: string[] };
};

async function omFetch(url: string): Promise<OpenMeteoResp | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(url, { next: { revalidate: 300 }, signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as OpenMeteoResp;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function cityFrom(data: OpenMeteoResp | null): CityConditions {
  const code = data && data.current_weather && data.current_weather.weathercode;
  const temp = data && data.current_weather && data.current_weather.temperature;
  return {
    weather: typeof code === "number" ? mapWeatherCode(code) : "clear",
    temperature: typeof temp === "number" ? temp : null,
  };
}

// Bratislava (drives scene) + Split (destination) weather in parallel.
// Cached 5 min server-side via Next fetch cache; 2 s per-request timeout.
async function fetchConditions(): Promise<Conditions> {
  const braUrl =
    "https://api.open-meteo.com/v1/forecast?latitude=48.15&longitude=17.11&current_weather=true&daily=sunrise,sunset&timezone=Europe%2FBratislava";
  const splitUrl =
    "https://api.open-meteo.com/v1/forecast?latitude=43.51&longitude=16.44&current_weather=true&timezone=Europe%2FZagreb";
  const [bra, split] = await Promise.all([omFetch(braUrl), omFetch(splitUrl)]);
  const braCity = cityFrom(bra);
  const splitCity = cityFrom(split);
  const sunrise = bra && bra.daily && bra.daily.sunrise && bra.daily.sunrise[0];
  const sunset = bra && bra.daily && bra.daily.sunset && bra.daily.sunset[0];
  return {
    weather: braCity.weather,
    temperature: braCity.temperature,
    sunriseH: sunrise ? parseIsoHour(sunrise) : 6,
    sunsetH: sunset ? parseIsoHour(sunset) : 20,
    split: splitCity,
  };
}

// Live check of https://isfable5back.com/ — is claude-fable-5 available again?
// Conservative: defaults to offline on any failure or ambiguity. 2 s timeout,
// cached 60 s server-side (the site itself polls Anthropic every minute).
async function fetchFableBack(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch("https://isfable5back.com/", {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const html = (await res.text()).toLowerCase();
    const offline =
      html.indexOf("not available") >= 0 ||
      html.indexOf("offline") >= 0 ||
      html.indexOf("unavailable") >= 0 ||
      html.indexOf("suspended") >= 0;
    const back =
      html.indexOf("is back") >= 0 ||
      html.indexOf("now available") >= 0 ||
      html.indexOf("back online") >= 0;
    return back && !offline;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Current local hour in Bratislava (decimal), regardless of server TZ.
function currentBratislavaHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bratislava",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour");
  const m = parts.find((p) => p.type === "minute");
  const hn = h ? parseInt(h.value, 10) : 0;
  const mn = m ? parseInt(m.value, 10) : 0;
  // "24" can surface for midnight in some runtimes — normalise.
  return (hn === 24 ? 0 : hn) + mn / 60;
}

// Maps the current time to a sun position along a sine arc from sunrise to sunset.
// visible=false at night — the caller omits the sun layer entirely.
function computeSunPosition(
  hourBA: number,
  sunriseH: number,
  sunsetH: number
): { left: number; top: number; visible: boolean } {
  if (hourBA < sunriseH || hourBA > sunsetH || sunsetH <= sunriseH) {
    return { left: 50, top: 120, visible: false };
  }
  const progress = (hourBA - sunriseH) / (sunsetH - sunriseH); // 0..1
  const angle = progress * Math.PI;                             // 0..π
  const left = 12 + progress * 76;                              // 12% at sunrise → 88% at sunset
  const top = 78 - Math.sin(angle) * 58;                        // 78% at horizon → 20% at noon
  return { left, top, visible: true };
}

// Moon arcs between sunset and next sunrise. Not astronomically accurate — the moon
// doesn't actually rise/set at the sun's hours — but for a background TV scene the
// feel of "moon up at night" is the goal.
function computeMoonPosition(
  hourBA: number,
  sunriseH: number,
  sunsetH: number
): { left: number; top: number; visible: boolean } {
  let h = hourBA < sunriseH ? hourBA + 24 : hourBA;
  const nightStart = sunsetH;
  const nightEnd = sunriseH + 24;
  if (h < nightStart || h > nightEnd || nightEnd <= nightStart) {
    return { left: 50, top: 120, visible: false };
  }
  const progress = (h - nightStart) / (nightEnd - nightStart);
  const angle = progress * Math.PI;
  const left = 12 + progress * 76;
  const top = 78 - Math.sin(angle) * 58;
  return { left, top, visible: true };
}

// Synodic-month math against a known new-moon epoch.
// Reference new moon: 2000-01-06 18:14 UT = JD 2451550.1.
// phase: 0..1 fraction of synodic month (0 = new, 0.5 = full).
// illumination: 0 at new, 1 at full, smooth between.
function computeMoonPhase(nowMs: number): { phase: number; illumination: number } {
  const jd = nowMs / 86400000 + 2440587.5;
  const synodic = 29.530588853;
  let phase = ((jd - 2451550.1) % synodic) / synodic;
  if (phase < 0) phase += 1;
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
  return { phase, illumination };
}

// Sky palette phase. Dawn/dusk bands are ±75 min either side of sunrise/sunset;
// outside those, "day" between them and "night" outside.
function computeSkyPhase(hourBA: number, sunriseH: number, sunsetH: number): SkyPhase {
  const pad = 1.25;
  if (hourBA >= sunriseH - pad && hourBA <= sunriseH + pad) return "dawn";
  if (hourBA >= sunsetH - pad && hourBA <= sunsetH + pad) return "dusk";
  if (hourBA > sunriseH + pad && hourBA < sunsetH - pad) return "day";
  return "night";
}

function formatTemp(t: number | null): string {
  if (t === null) return "—";
  return Math.round(t) + "°";
}

type TimeParts = { d: number; h: number; m: number; s: number };

// Time remaining until a target (countdown). Clamped at zero.
function compute(nowMs: number, target: number): TimeParts {
  let ms = target - nowMs;
  if (ms < 0) ms = 0;
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
}

// Time elapsed since an epoch (count-up). Clamped at zero.
function computeUp(nowMs: number, epoch: number): TimeParts {
  return compute(0, nowMs - epoch);
}

// Deterministic star positions (same every render so SSR and client match)
const STARS = (() => {
  const arr: Array<{ x: number; y: number; s: number; d: number; o: number }> = [];
  for (let i = 0; i < 52; i++) {
    arr.push({
      x: ((i * 73) % 1000) / 10,
      y: ((i * 149) % 560) / 10,
      s: 1 + (i % 3),
      d: (i * 0.27) % 4,
      o: 0.35 + ((i * 17) % 60) / 100,
    });
  }
  return arr;
})();

// Deterministic rain streaks — kept small for TV GPU budget.
const RAIN = (() => {
  const arr: Array<{ x: number; d: number; du: number; o: number }> = [];
  for (let i = 0; i < 16; i++) {
    arr.push({
      x: (i * 613) % 100,
      d: ((i * 17) % 80) / 100,
      du: 0.65 + ((i * 11) % 45) / 100,
      o: 0.4 + ((i * 7) % 40) / 100,
    });
  }
  return arr;
})();

// Deterministic sparkles on the water — sun/moon glitter on wave crests.
const GLITTER = (() => {
  const arr: Array<{ x: number; y: number; s: number; d: number; o: number }> = [];
  for (let i = 0; i < 26; i++) {
    arr.push({
      x: (i * 619) % 100,
      y: 84 + ((i * 37) % 140) / 10, // 84–98% vertically (inside the wave area)
      s: 1 + (i % 2),
      d: (i * 0.31) % 3,
      o: 0.4 + ((i * 13) % 50) / 100,
    });
  }
  return arr;
})();

// Deterministic snow flakes.
const SNOW = (() => {
  const arr: Array<{ x: number; d: number; du: number; s: number; o: number }> = [];
  for (let i = 0; i < 14; i++) {
    arr.push({
      x: (i * 419) % 100,
      d: ((i * 37) % 60) / 10,
      du: 5 + ((i * 13) % 35) / 10,
      s: 4 + (i % 3),
      o: 0.65 + ((i * 11) % 35) / 100,
    });
  }
  return arr;
})();

function Cloud({ className }: { className: string }) {
  return (
    <svg className={"cloud " + className} viewBox="0 0 260 110" preserveAspectRatio="none" aria-hidden="true">
      <ellipse cx="60" cy="72" rx="55" ry="26" />
      <ellipse cx="128" cy="54" rx="68" ry="34" />
      <ellipse cx="200" cy="70" rx="55" ry="26" />
    </svg>
  );
}

// A single fixed-width digit group. Splitting into per-digit cells keeps the
// numbers from shifting horizontally when a value changes. `min` is the
// minimum number of cells (days can grow to 3; h/m/s are always 2).
function DigitGroup({ id, value, min = 2 }: { id: string; value: number; min?: number }) {
  const raw = String(value);
  const len = Math.max(min, raw.length);
  const s = raw.length < len ? "0".repeat(len - raw.length) + raw : raw;
  const chars: string[] = [];
  for (let i = 0; i < s.length; i++) chars.push(s.charAt(i));
  return (
    <span id={id} className="num">
      {chars.map((c, i) => (
        // Text is rewritten imperatively by the ES5 ticker — React must not
        // reconcile it on hydration (it may differ by the time JS first runs).
        <span key={i} id={id + "-" + i} className="dig" suppressHydrationWarning>
          {c}
        </span>
      ))}
    </span>
  );
}

// The four-unit countdown row, reused by every slide for a consistent feel.
function Countdown({
  prefix,
  t,
  labels,
}: {
  prefix: string;
  t: TimeParts;
  labels: [string, string, string, string];
}) {
  return (
    <div
      className="countdown rise"
      style={{ WebkitAnimationDelay: "160ms", animationDelay: "160ms" }}
    >
      <div className="cell">
        <DigitGroup id={prefix + "-d"} value={t.d} min={2} />
        <span className="lbl">{labels[0]}</span>
      </div>
      <div className="cell">
        <DigitGroup id={prefix + "-h"} value={t.h} min={2} />
        <span className="lbl">{labels[1]}</span>
      </div>
      <div className="cell">
        <DigitGroup id={prefix + "-m"} value={t.m} min={2} />
        <span className="lbl">{labels[2]}</span>
      </div>
      <div className="cell">
        <DigitGroup id={prefix + "-s"} value={t.s} min={2} />
        <span className="lbl">{labels[3]}</span>
      </div>
    </div>
  );
}

// One d/h/m/s unit for a grid cell (number stacked over its label).
function GUnit({ id, v, lbl }: { id: string; v: number; lbl: string }) {
  return (
    <div className="gunit">
      <DigitGroup id={id} value={v} min={2} />
      <span className="glbl">{lbl}</span>
    </div>
  );
}

// A single tile in the all-countdowns grid view. Its digit ids carry a "g"
// prefix so the ticker updates them alongside the full-screen slides.
function GridCell({
  cls,
  kicker,
  title,
  meta,
  prefix,
  t,
  labels,
  watermark,
  scene,
}: {
  cls: string;
  kicker: string;
  title: string;
  meta: string;
  prefix: string;
  t: TimeParts;
  labels: [string, string, string, string];
  watermark?: string;
  scene?: React.ReactNode;
}) {
  return (
    <div className="gcell">
      <div className={"gcell-card " + cls}>
        {scene}
        <div className="gcell-scrim" />
        {watermark && (
          <div className="gcell-wm" aria-hidden="true">
            {watermark}
          </div>
        )}
        <div className="gcell-inner">
          <div className="gcell-kicker">{kicker}</div>
          <div className="gcell-title">{title}</div>
          <div className="gcell-cd">
            <GUnit id={prefix + "-d"} v={t.d} lbl={labels[0]} />
            <GUnit id={prefix + "-h"} v={t.h} lbl={labels[1]} />
            <GUnit id={prefix + "-m"} v={t.m} lbl={labels[2]} />
            <GUnit id={prefix + "-s"} v={t.s} lbl={labels[3]} />
          </div>
          <div className="gcell-meta">{meta}</div>
        </div>
      </div>
    </div>
  );
}

// The catamaran silhouette — shared by the full scene and the grid tile.
function CatamaranSvg({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 320 300" fill="#020a16">
      {/* Mast — tall spine with a masthead cap */}
      <rect x="158" y="6" width="3.2" height="236" />
      <rect x="153" y="4" width="12" height="5" />
      {/* Gennaker — large curved headsail on the fore triangle */}
      <path d="M 158 30 Q 68 158 74 242 L 158 242 Z" opacity="0.82" />
      {/* Mainsail — wind-filled (curved leech) */}
      <path d="M 158 12 Q 260 136 228 242 L 158 242 Z" />
      {/* Boom */}
      <rect x="158" y="242" width="72" height="3" />
      {/* Rigging stays (shrouds + forestay) */}
      <path d="M 160 18 L 16 260" stroke="#020a16" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M 160 18 L 304 260" stroke="#020a16" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M 160 38 L 160 260" stroke="#020a16" strokeWidth="0.8" opacity="0.35" fill="none" />
      {/* Bimini sun cover over the cockpit */}
      <path d="M 80 248 L 240 248 L 228 258 L 92 258 Z" opacity="0.82" />
      <rect x="80" y="248" width="3" height="14" opacity="0.7" />
      <rect x="237" y="248" width="3" height="14" opacity="0.7" />
      {/* Bridge deck / salon */}
      <path d="M 62 262 L 258 262 L 244 278 L 76 278 Z" />
      {/* Warm lit cabin windows */}
      <g className="cat-windows">
        <rect x="84"  y="267" width="16" height="6" />
        <rect x="104" y="267" width="16" height="6" />
        <rect x="124" y="267" width="16" height="6" />
        <rect x="144" y="267" width="16" height="6" />
        <rect x="164" y="267" width="16" height="6" />
        <rect x="184" y="267" width="16" height="6" />
        <rect x="204" y="267" width="16" height="6" />
        <rect x="224" y="267" width="16" height="6" />
      </g>
      {/* Port hull (bow to the left) */}
      <path d="M 16 282 Q 70 288 150 284 L 150 290 Q 70 292 14 288 Q 10 285 16 282 Z" />
      {/* Starboard hull (bow to the right) */}
      <path d="M 170 284 Q 250 288 304 282 Q 310 285 306 288 Q 250 292 170 290 Z" />
      {/* Subtle water wake under each hull */}
      <path d="M 24 294 Q 82 296 146 294" stroke="#f3e9d2" strokeWidth="1.2" opacity="0.18" fill="none" />
      <path d="M 174 294 Q 238 296 296 294" stroke="#f3e9d2" strokeWidth="1.2" opacity="0.18" fill="none" />
    </svg>
  );
}

// Compact, static catamaran-at-sunset scene for the grid tile.
function TbMiniScene() {
  return (
    <div className="gtb-scene" aria-hidden="true">
      <span className="gtb-sun" />
      <svg className="gtb-islands" viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path
          d="M0 55 L90 42 L160 50 L230 30 L340 48 L430 38 L540 52 L640 30 L760 48 L860 42 L970 50 L1060 36 L1200 50 L1200 60 L0 60 Z"
          fill="#0a2a48"
          opacity="0.85"
        />
      </svg>
      <div className="gtb-waves">
        <svg className="gtb-wave gtb-wave-b" viewBox="0 0 2400 200" preserveAspectRatio="none">
          <path d="M0 80 C180 40, 360 130, 600 80 C840 30, 1020 130, 1200 80 C1380 30, 1560 130, 1800 80 C2040 30, 2220 130, 2400 80 L2400 200 L0 200 Z" fill="#0e3a5c" />
        </svg>
        <svg className="gtb-wave gtb-wave-a" viewBox="0 0 2400 200" preserveAspectRatio="none">
          <path d="M0 90 C160 40, 320 140, 600 90 C880 40, 1040 140, 1200 90 C1360 40, 1520 140, 1800 90 C2080 40, 2240 140, 2400 90 L2400 200 L0 200 Z" fill="#062138" />
        </svg>
      </div>
      <CatamaranSvg className="gtb-cat" />
    </div>
  );
}

// ============================================================================
// Slide 1 — Teambuilding Vol. II (live Bratislava weather scene → Split)
// ============================================================================
function TeambuildingScene({
  cond,
  sun,
  moon,
  moonPhase,
  nowMs,
}: {
  cond: Conditions;
  sun: { left: number; top: number; visible: boolean };
  moon: { left: number; top: number; visible: boolean };
  moonPhase: { phase: number; illumination: number };
  nowMs: number;
}) {
  const weather = cond.weather;
  const cloudy = weather === "cloudy" || weather === "rain" || weather === "snow" || weather === "storm";
  const showClouds = weather === "partly" || cloudy;
  const t = compute(nowMs, TB_TARGET_MS);

  // Two-circle moon: a light disc + an offset shadow disc clipped to it.
  const moonShadowOffset =
    moonPhase.phase < 0.5 ? moonPhase.phase * 200 : (1 - moonPhase.phase) * 200;
  const moonShadowCx = moonPhase.phase < 0.5 ? -moonShadowOffset : moonShadowOffset;
  const moonOpacity = 0.3 + moonPhase.illumination * 0.7;

  return (
    <>
      <div className="sky" aria-hidden="true" />

      <div className={"stars stars-" + weather} aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              left: s.x + "%",
              top: s.y + "%",
              width: s.s + "px",
              height: s.s + "px",
              opacity: s.o,
              WebkitAnimationDelay: s.d + "s",
              animationDelay: s.d + "s",
            }}
          />
        ))}
      </div>

      {sun.visible && (
        <div className={"sun-layer sun-layer-" + weather} aria-hidden="true">
          <div className="sun-glow" style={{ left: sun.left + "%", top: sun.top + "%" }} />
          <div className="sun-disc" style={{ left: sun.left + "%", top: sun.top + "%" }} />
        </div>
      )}

      {moon.visible && (
        <div
          className={"moon-layer moon-layer-" + weather}
          aria-hidden="true"
          style={{ opacity: moonOpacity }}
        >
          <svg
            className="moon"
            viewBox="-55 -55 110 110"
            style={{ left: moon.left + "%", top: moon.top + "%" }}
          >
            <defs>
              <clipPath id="moonClip">
                <circle cx="0" cy="0" r="50" />
              </clipPath>
            </defs>
            <circle cx="0" cy="0" r="50" fill="#f3e9d2" />
            <circle cx={moonShadowCx} cy="0" r="50" fill="#0a1a2a" clipPath="url(#moonClip)" />
          </svg>
        </div>
      )}

      {showClouds && (
        <div className={"clouds clouds-" + weather} aria-hidden="true">
          <Cloud className="cloud-1" />
          <Cloud className="cloud-2" />
          <Cloud className="cloud-3" />
        </div>
      )}

      {weather === "fog" && (
        <div className="fog" aria-hidden="true">
          <div className="fog-band fog-1" />
          <div className="fog-band fog-2" />
          <div className="fog-band fog-3" />
        </div>
      )}

      <svg className="islands" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 55 L90 42 L160 50 L230 30 L340 48 L430 38 L540 52 L640 30 L760 48 L860 42 L970 50 L1060 36 L1200 50 L1200 60 L0 60 Z"
          fill="#071a33"
          opacity="0.9"
        />
      </svg>

      <div className="waves" aria-hidden="true">
        <div className="wave wave-c">
          <svg viewBox="0 0 2400 200" preserveAspectRatio="none">
            <path
              d="M0 60 C200 20, 400 100, 600 60 C800 20, 1000 100, 1200 60 C1400 20, 1600 100, 1800 60 C2000 20, 2200 100, 2400 60 L2400 200 L0 200 Z"
              fill="#0e3a5c"
            />
          </svg>
        </div>
        <div className="wave wave-b">
          <svg viewBox="0 0 2400 200" preserveAspectRatio="none">
            <path
              d="M0 80 C180 40, 360 130, 600 80 C840 30, 1020 130, 1200 80 C1380 30, 1560 130, 1800 80 C2040 30, 2220 130, 2400 80 L2400 200 L0 200 Z"
              fill="#082944"
            />
          </svg>
        </div>
        <div className="wave wave-a">
          <svg viewBox="0 0 2400 200" preserveAspectRatio="none">
            <path
              d="M0 90 C160 40, 320 140, 600 90 C880 40, 1040 140, 1200 90 C1360 40, 1520 140, 1800 90 C2080 40, 2240 140, 2400 90 L2400 200 L0 200 Z"
              fill="#03111f"
            />
          </svg>
        </div>
      </div>

      {moon.visible && (
        <div
          className="reflection reflection-moon"
          aria-hidden="true"
          style={{ left: moon.left + "%", opacity: 0.25 + moonPhase.illumination * 0.55 }}
        />
      )}

      <div className="glitter" aria-hidden="true">
        {GLITTER.map((g, i) => (
          <span
            key={i}
            className="glit"
            style={{
              left: g.x + "%",
              top: g.y + "%",
              width: g.s + "px",
              height: g.s + "px",
              opacity: g.o,
              WebkitAnimationDelay: g.d + "s",
              animationDelay: g.d + "s",
            }}
          />
        ))}
      </div>

      <div className="cat" aria-hidden="true">
        <CatamaranSvg className="cat-svg" />
      </div>

      {(weather === "rain" || weather === "storm") && (
        <div className="rain" aria-hidden="true">
          {RAIN.map((r, i) => (
            <span
              key={i}
              className="drop"
              style={{
                left: r.x + "%",
                opacity: r.o,
                WebkitAnimationDelay: r.d + "s",
                animationDelay: r.d + "s",
                WebkitAnimationDuration: r.du + "s",
                animationDuration: r.du + "s",
              }}
            />
          ))}
        </div>
      )}

      {weather === "snow" && (
        <div className="snow" aria-hidden="true">
          {SNOW.map((s, i) => (
            <span
              key={i}
              className="flake"
              style={{
                left: s.x + "%",
                width: s.s + "px",
                height: s.s + "px",
                opacity: s.o,
                WebkitAnimationDelay: s.d + "s",
                animationDelay: s.d + "s",
                WebkitAnimationDuration: s.du + "s",
                animationDuration: s.du + "s",
              }}
            />
          ))}
        </div>
      )}

      {weather === "storm" && <div className="lightning" aria-hidden="true" />}

      <div className="grain" aria-hidden="true" />

      <div className="content">
        <div className="topbar">
          <span className="tb-city">{`BA · ${formatTemp(cond.temperature)} · ${weatherLabel(cond.weather)}`}</span>
          <span className="tb-route">Viede&#328; &#10022; Split &middot; HR</span>
          <span className="tb-city">{`SPLIT · ${formatTemp(cond.split.temperature)} · ${weatherLabel(cond.split.weather)} · 27.06.2026`}</span>
        </div>
        <div className="rule" />
        <div className="hero">
          <div className="kicker rise">
            Teambuilding <span className="vol">Vol. II</span>
          </div>
          <Countdown prefix="tb" t={t} labels={["dní", "hod", "min", "sek"]} />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Slide 2 — Telekom Night Run (Bratislava, magenta neon)
// ============================================================================
function NightRunScene({ nowMs }: { nowMs: number }) {
  const t = compute(nowMs, NR_TARGET_MS);
  return (
    <>
      {/* Full-bleed photo (public/nightrun.jpg) + legibility shade + magenta wash */}
      <div className="nr-photo" aria-hidden="true" />
      <div className="nr-shade" aria-hidden="true" />
      <div className="nr-tint" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="content">
        <div className="topbar">
          <span className="tb-city">TELEKOM</span>
          <span className="tb-route">BRATISLAVA &middot; SK</span>
          <span className="tb-city">10 KM &middot; 05.09.2026 &middot; 20:00</span>
        </div>
        <div className="rule" />
        <div className="hero">
          <div className="kicker rise">
            Telekom <span className="vol">Night Run</span>
          </div>
          <Countdown prefix="nr" t={t} labels={["dní", "hod", "min", "sek"]} />
          <div className="nr-foot rise">10 KM &middot; NOČNÝ BEH ULICAMI BRATISLAVY</div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Slide 3 — GTA VI (Vice City synthwave)
// ============================================================================
function GtaScene({ nowMs }: { nowMs: number }) {
  const t = compute(nowMs, GTA_TARGET_MS);
  return (
    <>
      {/* Official GTA VI key art (public/gta6.jpg) + poster scrim. */}
      <div className="gta-photo" aria-hidden="true" />
      <div className="gta-shade" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="content">
        <div className="topbar">
          <span className="tb-city">ROCKSTAR GAMES</span>
          <span className="tb-route">VICE CITY &middot; LEONIDA</span>
          <span className="tb-city">PS5 / XBOX SERIES X|S</span>
        </div>
        <div className="rule" />
        <div className="hero">
          <div className="gta-title rise">
            <span className="gta-grand">GRAND THEFT AUTO</span>
            <span className="gta-vi">VI</span>
          </div>
          <Countdown prefix="gta" t={t} labels={["days", "hrs", "min", "sec"]} />
          <div className="gta-foot rise">PREMI&Eacute;RA &middot; 19 . 11 . 2026</div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Slide 4 — Is Fable 5 back? (live status, count-UP since it went offline)
// ============================================================================
function FableScene({ nowMs, back }: { nowMs: number; back: boolean }) {
  const t = computeUp(nowMs, FABLE_OFFLINE_MS);
  return (
    <>
      <div className={"fb-bg " + (back ? "fb-bg-on" : "fb-bg-off")} aria-hidden="true" />
      <div className={"fb-glow " + (back ? "fb-glow-on" : "fb-glow-off")} aria-hidden="true" />
      <div className="fb-mesh" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="content">
        <div className="topbar">
          <span className="tb-city">ISFABLE5BACK.COM</span>
          <span className="tb-route">CLAUDE &middot; FABLE 5</span>
          <span className="tb-city">{back ? "200 OK" : "503 UNAVAILABLE"}</span>
        </div>
        <div className="rule" />

        <div className={"hero fb-hero " + (back ? "is-on" : "is-off")}>
          <div className="fb-q rise">IS FABLE 5 BACK?</div>
          <div className="fb-answer rise">{back ? "YES" : "NO"}</div>
          <div className="fb-sub rise">
            {back ? "claude-fable-5 is live again" : "claude-fable-5 is offline"}
          </div>

          {!back && (
            <div className="fb-down rise">
              <div className="fb-eyebrow">OFFLINE FOR</div>
              <Countdown prefix="fb" t={t} labels={["dní", "hod", "min", "sek"]} />
              <div className="fb-foot">
                <span>OFFLINE SINCE 12.06.2026</span>
                <span className="fb-poll">
                  <span className="fb-poll-fill" />
                </span>
                <span>RE-CHECK 60s</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default async function Page() {
  const nowMs = Date.now();
  const [cond, fableBack] = await Promise.all([fetchConditions(), fetchFableBack()]);

  const hourBA = currentBratislavaHour(new Date(nowMs));
  const sun = computeSunPosition(hourBA, cond.sunriseH, cond.sunsetH);
  const moon = computeMoonPosition(hourBA, cond.sunriseH, cond.sunsetH);
  const moonPhase = computeMoonPhase(nowMs);
  const skyPhase = computeSkyPhase(hourBA, cond.sunriseH, cond.sunsetH);

  // Slides, in rotation order. The teambuilding slide carries the live
  // weather/sky classes (its scene CSS keys off them).
  const slides: Array<{ cls: string; name: string; node: React.ReactNode }> = [
    {
      cls: "slide-tb weather-" + cond.weather + " sky-" + skyPhase,
      name: "Teambuilding",
      node: (
        <TeambuildingScene cond={cond} sun={sun} moon={moon} moonPhase={moonPhase} nowMs={nowMs} />
      ),
    },
    { cls: "slide-nr", name: "Night Run", node: <NightRunScene nowMs={nowMs} /> },
    { cls: "slide-gta", name: "GTA VI", node: <GtaScene nowMs={nowMs} /> },
    { cls: "slide-fable", name: "Fable 5", node: <FableScene nowMs={nowMs} back={fableBack} /> },
  ];

  // Views = the 4 slides (3 min each) + a grid of all countdowns (5 min).
  // Active view is picked deterministically by walking the duration schedule,
  // so it survives the 30 s meta-refresh exactly like the per-slide rotation.
  const DUR = [ROTATE_MS, ROTATE_MS, ROTATE_MS, ROTATE_MS, GRID_MS];
  const VIEWS = DUR.length; // 5
  const GRID_VIEW = 4;
  const totalCycle = ROTATE_MS * 4 + GRID_MS;
  let active = 0;
  {
    const ph = nowMs % totalCycle;
    let acc = 0;
    for (let i = 0; i < DUR.length; i++) {
      if (ph < acc + DUR[i]) { active = i; break; }
      acc += DUR[i];
    }
  }
  const navNames = [slides[0].name, slides[1].name, slides[2].name, slides[3].name, "All"];

  // Countdown values for the grid tiles (same maths as the slides).
  const gTb = compute(nowMs, TB_TARGET_MS);
  const gNr = compute(nowMs, NR_TARGET_MS);
  const gGta = compute(nowMs, GTA_TARGET_MS);
  const gFb = computeUp(nowMs, FABLE_OFFLINE_MS);

  // ES5-safe ticker. Updates every digit cell each second (variable cell count
  // so days can grow past 99), then paints the active slide + nav.
  // Active slide = clock-driven (floor(now/R)%N) UNLESS the user has pinned one
  // by clicking a nav label. The pin lives in location.hash (#s=2) so it persists
  // across the layout.tsx <meta refresh=30> reload; clicking the active label
  // again clears the pin and resumes auto-rotation.
  const tickerJs =
    "(function(){" +
    "var R=" + ROTATE_MS + ",G=" + GRID_MS + ",N=" + VIEWS + ";" +
    "var DUR=[R,R,R,R,G],TOT=R*4+G;" +
    "var CD=[['tb'," + TB_TARGET_MS + "],['nr'," + NR_TARGET_MS + "],['gta'," + GTA_TARGET_MS + "]," +
    "['gtb'," + TB_TARGET_MS + "],['gnr'," + NR_TARGET_MS + "],['ggta'," + GTA_TARGET_MS + "]];" +
    "var UP=[['fb'," + FABLE_OFFLINE_MS + "],['gfb'," + FABLE_OFFLINE_MS + "]];" +
    "var manual=-1;var mm=String(window.location.hash||'').match(/s=(\\d+)/);if(mm){var mi=parseInt(mm[1],10);if(mi>=0&&mi<N)manual=mi;}" +
    "function setVar(id,val){var cells=[],i=0,c;while((c=document.getElementById(id+'-'+i))){cells.push(c);i++;}if(!cells.length)return;" +
    "var s=String(val);while(s.length<cells.length)s='0'+s;if(s.length>cells.length)s=s.substring(s.length-cells.length);" +
    "for(var j=0;j<cells.length;j++){var ch=s.charAt(j);if(cells[j].firstChild)cells[j].firstChild.nodeValue=ch;else cells[j].innerHTML=ch;}}" +
    "function units(p,ms){if(ms<0)ms=0;setVar(p+'-d',Math.floor(ms/86400000));setVar(p+'-h',Math.floor((ms%86400000)/3600000));setVar(p+'-m',Math.floor((ms%3600000)/60000));setVar(p+'-s',Math.floor((ms%60000)/1000));}" +
    "function autoView(now){var ph=now%TOT,acc=0,i;for(i=0;i<N;i++){if(ph<acc+DUR[i])return i;acc+=DUR[i];}return 0;}" +
    "function paint(idx){var i;for(i=0;i<4;i++){var el=document.getElementById('slide-'+i);if(el)el.style.display=(i===idx)?'block':'none';}" +
    "var g=document.getElementById('grid-view');if(g)g.style.display=(idx===4)?'block':'none';" +
    "for(i=0;i<N;i++){var nv=document.getElementById('nav-'+i);if(nv)nv.className='nav-item'+(i===idx?' nav-on':'')+(manual===i?' nav-pin':'');}}" +
    "function tick(){var now=(new Date()).getTime();var i;for(i=0;i<CD.length;i++){units(CD[i][0],CD[i][1]-now);}for(i=0;i<UP.length;i++){units(UP[i][0],now-UP[i][1]);}" +
    "paint(manual>=0?manual:autoView(now));}" +
    "for(var k=0;k<N;k++){(function(j){var nv=document.getElementById('nav-'+j);if(nv){nv.onclick=function(){manual=(manual===j?-1:j);try{window.location.hash=(manual>=0?'s='+manual:'');}catch(e){}tick();};}})(k);}" +
    "tick();setInterval(tick,1000);" +
    "})();";

  return (
    <main className="carousel">
      {slides.map((sl, i) => (
        // display + nav className are driven imperatively by the ticker — suppress
        // hydration reconciliation on the nodes it mutates before React loads.
        <section
          key={i}
          id={"slide-" + i}
          className={"stage-slide " + sl.cls}
          style={{ display: i === active ? undefined : "none" }}
          suppressHydrationWarning
        >
          {sl.node}
        </section>
      ))}

      {/* Grid view — all four countdowns at once (2×2, responsive). */}
      <section
        id="grid-view"
        className="stage-slide grid-view"
        style={{ display: active === GRID_VIEW ? undefined : "none" }}
        suppressHydrationWarning
      >
        <div className="grid-wrap">
          <GridCell
            cls="gcell-tb"
            kicker="27.06.2026 · Split"
            title="Teambuilding"
            meta="Viedeň → Split · katamarán"
            prefix="gtb"
            t={gTb}
            labels={["dní", "hod", "min", "sek"]}
            scene={<TbMiniScene />}
          />
          <GridCell
            cls="gcell-nr"
            kicker="05.09.2026 · 20:00"
            title="Night Run"
            meta="Telekom · 10 km · Bratislava"
            prefix="gnr"
            t={gNr}
            labels={["dní", "hod", "min", "sek"]}
          />
          <GridCell
            cls="gcell-gta"
            kicker="19.11.2026"
            title="GTA VI"
            meta="Grand Theft Auto · PS5 / Xbox"
            prefix="ggta"
            t={gGta}
            labels={["days", "hrs", "min", "sec"]}
          />
          <GridCell
            cls="gcell-fb"
            kicker="503 · Offline"
            title="Fable 5"
            meta="Offline since 12.06.2026"
            prefix="gfb"
            t={gFb}
            labels={["dní", "hod", "min", "sek"]}
            watermark={fableBack ? "YES" : "NO"}
          />
        </div>
      </section>

      {/* Bottom nav — shows which view is on screen, highlights the active one */}
      <div className="slide-nav">
        {navNames.map((nm, i) => (
          <span
            key={i}
            id={"nav-" + i}
            className={"nav-item" + (i === active ? " nav-on" : "")}
            suppressHydrationWarning
          >
            {nm}
          </span>
        ))}
      </div>

      <script dangerouslySetInnerHTML={{ __html: tickerJs }} />
    </main>
  );
}
