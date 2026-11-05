#!/usr/bin/env node
// Renders video/use-cases.html into public/use-cases/<case>.{mp4,webm,jpg}, frame by frame:
// every CSS animation is paused and stepped to each frame's time, so the output is exact and
// repeatable (no screen recording). Needs Chromium for Playwright and ffmpeg (libx264, libvpx-vp9).
//   node video/render.mjs                 # all cases
//   node video/render.mjs newsroom        # one case
// Flags: --scale=1.5 (1920×1080), --fps=30, --seconds=14, --poster-at=11.6 (seconds).
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "use-cases");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.slice(name.length + 3)) : fallback;
};
const named = args.filter((x) => !x.startsWith("--"));
const cases = named.length ? named : ["newsroom", "evidence", "viral"];
const SCALE = flag("scale", 1.5);
const FPS = flag("fps", 30);
const SECONDS = flag("seconds", 14);
const POSTER_AT = flag("poster-at", 11.6);
mkdirSync(out, { recursive: true });
const run = promisify(execFile);

const browser = await chromium.launch();
// one page per case, all at once (each case is independent)
await Promise.all(cases.map(renderCase));
await browser.close();

async function renderCase(c) {
  const frames = mkdtempSync(join(tmpdir(), `stamper-${c}-`));
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: SCALE,
  });
  await page.goto(`${pathToFileURL(join(here, "use-cases.html")).href}?case=${c}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    for (const a of document.getAnimations()) a.pause();
  });
  const total = Math.round(SECONDS * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate(
      (t) => {
        for (const a of document.getAnimations()) a.currentTime = t;
      },
      (f * 1000) / FPS,
    );
    await page.screenshot({
      path: join(frames, `${String(f).padStart(4, "0")}.jpg`),
      type: "jpeg",
      quality: 95,
    });
  }
  // poster: the frame where all three scenes' story has landed
  await page.evaluate((t) => {
    for (const a of document.getAnimations()) a.currentTime = t;
  }, POSTER_AT * 1000);
  await page.screenshot({ path: join(out, `${c}.jpg`), type: "jpeg", quality: 82 });
  await page.close();

  const input = [
    "-y",
    "-loglevel",
    "error",
    "-framerate",
    String(FPS),
    "-i",
    join(frames, "%04d.jpg"),
  ];
  await run("ffmpeg", [
    ...input,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "24",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    join(out, `${c}.mp4`),
  ]);
  await run("ffmpeg", [
    ...input,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "38",
    "-row-mt",
    "1",
    "-pix_fmt",
    "yuv420p",
    "-an",
    join(out, `${c}.webm`),
  ]);
  rmSync(frames, { recursive: true, force: true });
  const kb = (f) => Math.round(statSync(join(out, f)).size / 1024);
  console.log(
    `${c}: ${total} frames → ${c}.mp4 ${kb(`${c}.mp4`)} KB, ${c}.webm ${kb(`${c}.webm`)} KB, ${c}.jpg ${kb(`${c}.jpg`)} KB`,
  );
}
