"use client";
/** Image comparison in a worker: pixelmatch diff + SSIM between the original and the viewer's copy. */
import type { DiffResult, Pixels } from "./diff";

const MAX_SIDE = 1600;

/** Decodes an image Blob (EXIF-rotated by the browser) into RGBA at most MAX_SIDE on the long edge. */
export async function decodeImage(
  blob: Blob,
  size?: { width: number; height: number },
): Promise<Pixels> {
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  let width = size?.width ?? bmp.width;
  let height = size?.height ?? bmp.height;
  if (!size) {
    const k = Math.min(1, MAX_SIDE / Math.max(width, height));
    width = Math.max(1, Math.round(width * k));
    height = Math.max(1, Math.round(height * k));
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const img = ctx.getImageData(0, 0, width, height);
  return { data: img.data, width, height };
}

export async function compareImages(original: Blob, copy: Blob): Promise<DiffResult> {
  const a = await decodeImage(original);
  const b = await decodeImage(copy, { width: a.width, height: a.height });
  const w = new Worker(new URL("../workers/diff.worker.ts", import.meta.url), { type: "module" });
  try {
    return await new Promise<DiffResult>((resolve, reject) => {
      w.onmessage = (ev: MessageEvent) => {
        const m = ev.data as ({ ok: true } & DiffResult) | { ok: false; message: string };
        if (m.ok) resolve(m);
        else reject(new Error(m.message));
      };
      w.onerror = (e) => reject(new Error(e.message || "diff worker failed"));
      w.postMessage({ a, b }, [a.data.buffer, b.data.buffer]);
    });
  } finally {
    w.terminate();
  }
}

export async function diffToObjectUrl(r: DiffResult): Promise<string> {
  const canvas = new OffscreenCanvas(r.width, r.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(r.diff), r.width, r.height), 0, 0);
  return URL.createObjectURL(await canvas.convertToBlob({ type: "image/png" }));
}
