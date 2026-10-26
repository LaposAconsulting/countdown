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

// Clips: public/video-N.mp4, one per colleague (H.264 + AAC .mp4 for the TV).
// Env VIDEO_SRC can override with a comma-separated list of paths / URLs.
// Keep DEFAULT_VIDEOS in sync with the files actually in public/ — a missing
// file means a silent "no video" for that interval (the script hides on error).
const DEFAULT_VIDEOS = ["/video-1.mp4", "/video-2.mp4", "/video-3.mp4", "/video-4.mp4", "/video-5.mp4", "/video-6.mp4", "/video-7.mp4"];

// Written by the inline script when a clip starts playing, so the next pick
// (= next interval, since each reload is one interval) avoids an immediate repeat.
export const VIDEO_LAST_COOKIE = "vlast";

export function videoList(): string[] {
  const raw = (process.env.VIDEO_SRC || "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.length ? raw : DEFAULT_VIDEOS;
}

// The grid: all clips tiled on the page, played in sync, audio from tile 0.
// GRID_SRC is the pre-rendered version of the same look (made with make-grid.sh,
// rebuild it whenever a clip is added) — used by browsers that can't start all
// tiles (the 2014 TV). ORIGINAL_SRC is the unswapped clip, used only as a tile.
export const GRID_SRC = "/video-grid.mp4";
export const ORIGINAL_SRC = "/video-original.mp4";

export type VideoPick =
  | { kind: "clip"; src: string; index: number }
  | { kind: "grid"; tiles: string[]; fallback: string; index: number };

// Random pick per page load: one of the clips, or (with 2+ clips) the grid of
// all of them — never the same as the last one played in this browser.
export async function pickVideo(): Promise<VideoPick> {
  const list = videoList();
  const withGrid = list.length > 1;
  const n = list.length + (withGrid ? 1 : 0); // last index = the grid
  const c = (await cookies()).get(VIDEO_LAST_COOKIE);
  const last = c ? parseInt(c.value, 10) : -1;
  let candidates: number[] = [];
  for (let i = 0; i < n; i++) candidates.push(i);
  if (n > 1 && last >= 0 && last < n) candidates = candidates.filter((i) => i !== last);
  const index = candidates[Math.floor(Math.random() * candidates.length)];
  if (withGrid && index === list.length) {
    return { kind: "grid", tiles: list.concat(ORIGINAL_SRC), fallback: GRID_SRC, index };
  }
  return { kind: "clip", src: list[index], index };
}
