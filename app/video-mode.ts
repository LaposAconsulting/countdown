// "Video break" mode — every VIDEO_EVERY_MIN minutes the page plays a short video
// full-screen, then returns to the countdown. Server-side flag, resolved per
// request (the page is force-dynamic):
//
//   1. cookie `video=1` / `video=0`  — set by the hidden bottom-LEFT corner of the
//      page (#video-toggle), so the TV can be switched without touching the server.
//      Per browser: toggling on a laptop does not change the TV.
//   2. env VIDEO_MODE=1|true|on|yes  — the default when no cookie is set
//      (e.g. in .env.local, needs a restart of `next start`).
//
// Scheduling piggybacks on the layout.tsx <meta refresh>: in video mode the page
// reloads every videoPeriodMs() instead of every 30 s, and each load autoplays the
// video once — so "every N minutes" needs no client state and survives reloads.
// The video therefore has to be shorter than the period.
import { cookies } from "next/headers";

export const VIDEO_COOKIE = "video";
const DEFAULT_EVERY_MIN = 5;
const MAX_EVERY_MIN = 24 * 60;

// Minutes between plays: env VIDEO_EVERY_MIN (whole minutes, 1..1440), default 5.
// Anything unparsable or out of range falls back to the default.
export function videoEveryMin(): number {
  const raw = (process.env.VIDEO_EVERY_MIN || "").trim();
  const n = parseInt(raw, 10);
  if (!isFinite(n) || String(n) !== raw || n < 1 || n > MAX_EVERY_MIN) return DEFAULT_EVERY_MIN;
  return n;
}

export function videoPeriodMs(): number {
  return videoEveryMin() * 60000;
}

export async function isVideoMode(): Promise<boolean> {
  const c = (await cookies()).get(VIDEO_COOKIE);
  if (c && (c.value === "1" || c.value === "0")) return c.value === "1";
  const env = (process.env.VIDEO_MODE || "").trim().toLowerCase();
  return env === "1" || env === "true" || env === "on" || env === "yes";
}

// Video file: public/video.mp4 by default (H.264 + AAC .mp4 for the TV), or any
// absolute URL / path via env VIDEO_SRC.
export function videoSrc(): string {
  const s = (process.env.VIDEO_SRC || "").trim();
  return s || "/video.mp4";
}
