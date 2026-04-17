// Server-rendered countdown for a 2014 Samsung TV browser.
// No Tailwind, no modern CSS, no modern JS.
// Initial values are computed on the server so the page works with zero JS.
// A tiny ES5 script ticks the values locally; meta-refresh in layout.tsx
// resyncs every 30s as a safety net.

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

export default function Page() {
  const t = compute(Date.now());

  const tickerJs =
    "(function(){var T=" +
    TARGET_MS +
    ";function p(n){n=String(n);return n.length<2?'0'+n:n;}function t(){var m=T-(new Date()).getTime();if(m<0)m=0;var d=Math.floor(m/86400000);var h=Math.floor((m%86400000)/3600000);var mi=Math.floor((m%3600000)/60000);var s=Math.floor((m%60000)/1000);var e;e=document.getElementById('cd-d');if(e)e.innerHTML=p(d);e=document.getElementById('cd-h');if(e)e.innerHTML=p(h);e=document.getElementById('cd-m');if(e)e.innerHTML=p(mi);e=document.getElementById('cd-s');if(e)e.innerHTML=p(s);}t();setInterval(t,1000);})();";

  return (
    <main className="stage">
      <div className="sky" aria-hidden="true" />
      <div className="content">
        <div className="topbar">
          <span>Viede&#328; &#10022; Split &middot; HR</span>
          <span>27 &middot; 06 &middot; 2026</span>
        </div>
        <div style={{ padding: "0 48px" }}>
          <div className="rule" />
        </div>

        <div className="hero">
          <div className="kicker">
            Teambuilding <span className="vol">Vol. II</span>
          </div>

          <div className="countdown">
            <div className="cell">
              <span id="cd-d" className="num">{pad2(t.d)}</span>
              <span className="lbl">dn&iacute;</span>
            </div>
            <div className="cell">
              <span id="cd-h" className="num">{pad2(t.h)}</span>
              <span className="lbl">hod</span>
            </div>
            <div className="cell">
              <span id="cd-m" className="num">{pad2(t.m)}</span>
              <span className="lbl">min</span>
            </div>
            <div className="cell">
              <span id="cd-s" className="num">{pad2(t.s)}</span>
              <span className="lbl">sek</span>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: tickerJs }} />
    </main>
  );
}
