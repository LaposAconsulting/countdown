// Server-rendered countdown for a 2014 Samsung TV browser.
// Zero modern JS / CSS features on the wire.
// Initial values are SSR'd so the page works with JS disabled.
// A tiny ES5 ticker updates values every second;
// layout.tsx sets <meta refresh=30> as a safety net.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TARGET_MS = new Date("2026-06-27T00:00:00+02:00").getTime();

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

export default function Page() {
  const t = compute(Date.now());

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
    <main className="stage">
      <div className="sky" aria-hidden="true" />

      <div className="stars" aria-hidden="true">
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

      <div className="sun-glow" aria-hidden="true" />
      <div className="sun-disc" aria-hidden="true" />

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

      <div className="grain" aria-hidden="true" />

      <div className="content">
        <div className="topbar">
          <span>Viede&#328; &#10022; Split &middot; HR</span>
          <span>27 &middot; 06 &middot; 2026</span>
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
