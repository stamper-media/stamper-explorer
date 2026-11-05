#!/usr/bin/env node
// Renders video/use-cases.html into public/use-cases/<case>.{mp4,webm,jpg}, frame by frame:
// every CSS animation is paused and stepped to each frame's time, so the output is exact and
// repeatable (no screen recording). Needs Chromium for Playwright and ffmpeg (libx264, libvpx-vp9).
//   node video/render.mjs                 # all cases
//   node video/render.mjs newsroom        # one case
// Env: SCALE (default 1.5 → 1920×1080), FPS (30), SECONDS (14), POSTER_AT (seconds, default 11.6).
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "use-cases");
const cases = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["newsroom", "evidence", "viral"];
const SCALE = Number(process.env.SCALE ?? 1.5);
const FPS = Number(process.env.FPS ?? 30);
const SECONDS = Number(process.env.SECONDS ?? 14);
const POSTER_AT = Number(process.env.POSTER_AT ?? 11.6);
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
