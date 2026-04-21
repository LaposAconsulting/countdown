// Server-rendered countdown for a 2014 Samsung TV browser.
// Zero modern JS / CSS features on the wire.
// Initial values are SSR'd so the page works with JS disabled.
// A tiny ES5 ticker updates values every second;
// layout.tsx sets <meta refresh=30> as a safety net.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TARGET_MS = new Date("2026-06-27T00:00:00+02:00").getTime();

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

function pad2(n: number): string {
  const s = String(n);
  return s.length < 2 ? "0" + s : s;
}

function compute(nowMs: number) {
  let ms = TARGET_MS - nowMs;
  if (ms < 0) ms = 0;
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
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

export default async function Page() {
  const nowMs = Date.now();
  const cond = await fetchConditions();
  const weather = cond.weather;
  const hourBA = currentBratislavaHour(new Date(nowMs));
  const sun = computeSunPosition(hourBA, cond.sunriseH, cond.sunsetH);
  const moon = computeMoonPosition(hourBA, cond.sunriseH, cond.sunsetH);
  const moonPhase = computeMoonPhase(nowMs);
  const skyPhase = computeSkyPhase(hourBA, cond.sunriseH, cond.sunsetH);
  const t = compute(nowMs);
  const cloudy = weather === "cloudy" || weather === "rain" || weather === "snow" || weather === "storm";
  const showClouds = weather === "partly" || cloudy;

  // Two-circle moon: a light disc + an offset shadow disc clipped to it.
  // Offset direction/magnitude encodes phase. Formula matches lens-intersection
  // geometry so crescent/gibbous silhouettes come out correct.
  const moonShadowOffset =
    moonPhase.phase < 0.5 ? moonPhase.phase * 200 : (1 - moonPhase.phase) * 200;
  const moonShadowCx = moonPhase.phase < 0.5 ? -moonShadowOffset : moonShadowOffset;
  const moonOpacity = 0.3 + moonPhase.illumination * 0.7;

  // ES5-safe ticker. Updates each digit cell individually so the italic
  // numbers don't shift horizontally when the value changes.
  const tickerJs =
    "(function(){var T=" +
    TARGET_MS +
    ";function pad(n){n=String(n);return n.length<2?'0'+n:n;}function setDigits(id,val){var s=pad(val);var a=document.getElementById(id+'-0');var b=document.getElementById(id+'-1');if(a&&a.firstChild)a.firstChild.nodeValue=s.charAt(0);else if(a)a.innerHTML=s.charAt(0);if(b&&b.firstChild)b.firstChild.nodeValue=s.charAt(1);else if(b)b.innerHTML=s.charAt(1);}function tick(){var m=T-(new Date()).getTime();if(m<0)m=0;setDigits('cd-d',Math.floor(m/86400000));setDigits('cd-h',Math.floor((m%86400000)/3600000));setDigits('cd-m',Math.floor((m%3600000)/60000));setDigits('cd-s',Math.floor((m%60000)/1000));}tick();setInterval(tick,1000);})();";

  function Num({ id, value }: { id: string; value: number }) {
    const s = pad2(value);
    return (
      <span id={id} className="num">
        <span id={id + "-0"} className="dig">{s.charAt(0)}</span>
        <span id={id + "-1"} className="dig">{s.charAt(1)}</span>
      </span>
    );
  }

  return (
    <main className={"stage weather-" + weather + " sky-" + skyPhase}>
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
            <circle
              cx={moonShadowCx}
              cy="0"
              r="50"
              fill="#0a1a2a"
              clipPath="url(#moonClip)"
            />
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

      <svg
        className="islands"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
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

      <div className="cat" aria-hidden="true">
        <svg width="98" height="78" viewBox="0 0 220 180" fill="#020a16">
          <path d="M110 18 L110 118 L182 118 Z" />
          <path d="M110 36 L110 112 L62 112 Z" />
          <rect x="109" y="18" width="2.2" height="104" />
          <path d="M48 124 L196 124 L188 130 L56 130 Z" opacity="0.85" />
          <path d="M30 130 Q62 138 102 134 L102 146 Q60 150 26 142 Z" />
          <path d="M118 134 Q158 138 196 130 L198 142 Q158 150 120 146 Z" />
        </svg>
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

          <div className="countdown rise" style={{ WebkitAnimationDelay: "160ms", animationDelay: "160ms" }}>
            <div className="cell">
              <Num id="cd-d" value={t.d} />
              <span className="lbl">dn&iacute;</span>
            </div>
            <div className="cell">
              <Num id="cd-h" value={t.h} />
              <span className="lbl">hod</span>
            </div>
            <div className="cell">
              <Num id="cd-m" value={t.m} />
              <span className="lbl">min</span>
            </div>
            <div className="cell">
              <Num id="cd-s" value={t.s} />
              <span className="lbl">sek</span>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: tickerJs }} />
    </main>
  );
}
