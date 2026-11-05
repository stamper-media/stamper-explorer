/** Pure pixel comparison used by workers/diff.worker.ts (and unit tests). */
import pixelmatch from "pixelmatch";
import { ssim } from "ssim.js";

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
export type DiffResult = {
  diff: Uint8ClampedArray;
  width: number;
  height: number;
  differing: number;
  ratio: number;
  ssim: number;
};

const DIFF_COLOR: [number, number, number] = [230, 30, 40];
/**
 * The coarse pass compares both images low-passed, at a lower threshold. It finds broad, low-contrast
 * edits (a dark boat removed from dark water) that per-pixel matching misses, while recompression and
 * resize noise, being high-frequency, blurs away. Images smaller than this skip it.
 */
const COARSE_MIN_SIDE = 200;
const COARSE_THRESHOLD = 0.05;

export function diffPixels(a: Pixels, b: Pixels, threshold = 0.1): DiffResult {
  if (a.width !== b.width || a.height !== b.height) throw new Error("images must be the same size");
  const { width, height } = a;
  const diff = new Uint8ClampedArray(width * height * 4);
  let differing = pixelmatch(a.data, b.data, diff, width, height, {
    threshold,
    diffColor: DIFF_COLOR,
    alpha: 0.25,
  });
  const long = Math.max(width, height);
  if (long >= COARSE_MIN_SIDE) {
    const r = Math.max(1, Math.round(long / 400));
    const mask = new Uint8ClampedArray(width * height * 4);
    pixelmatch(
      blur(a.data, width, height, r),
      blur(b.data, width, height, r),
      mask,
      width,
      height,
      {
        threshold: COARSE_THRESHOLD,
        includeAA: true,
        diffMask: true,
      },
    );
    const [dr, dg, db] = DIFF_COLOR;
    for (let p = 0; p < mask.length; p += 4) {
      if (mask[p + 3] === 0) continue;
      if (diff[p] === dr && diff[p + 1] === dg && diff[p + 2] === db) continue;
      diff.set([dr, dg, db, 255], p);
      differing++;
    }
  }
  let s = 1;
  try {
    s = ssim(
      { data: a.data, width, height } as ImageData,
      { data: b.data, width, height } as ImageData,
    ).mssim;
  } catch {
    s = Number.NaN;
  }
  return { diff, width, height, differing, ratio: differing / (width * height), ssim: s };
}

/** Three box-blur passes each way (close to a Gaussian of sigma ≈ 1.15·r), edges clamped. */
function blur(src: Uint8ClampedArray, width: number, height: number, r: number): Uint8ClampedArray {
  const a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  for (let i = 0; i < 3; i++) {
    boxPass(a, b, height, width, 4, width * 4, r);
    boxPass(b, a, width, height, width * 4, 4, r);
  }
  return Uint8ClampedArray.from(a);
}

/** One box-blur pass along `lines` lines of `len` RGBA samples, `step` apart; lines start `lineStep` apart. */
function boxPass(
  src: Float32Array,
  dst: Float32Array,
  lines: number,
  len: number,
  step: number,
  lineStep: number,
  r: number,
): void {
  const n = 2 * r + 1;
  for (let l = 0; l < lines; l++) {
    for (let c = 0; c < 4; c++) {
      const o = l * lineStep + c;
      const at = (i: number) => src[o + Math.min(len - 1, Math.max(0, i)) * step] as number;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += at(k);
      for (let i = 0; i < len; i++) {
        dst[o + i * step] = sum / n;
        sum += at(i + r + 1) - at(i - r);
      }
    }
  }
}
