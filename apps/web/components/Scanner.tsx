"use client";
import { parseVerifyPath } from "@stamper/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SCAN } from "../lib/copy";

type Detector = { detect(src: ImageBitmapSource): Promise<Array<{ rawValue: string }>> };

let detectorP: Promise<Detector> | null = null;
/** barcode-detector ponyfill; the zxing wasm is served from /zxing_reader.wasm (never a CDN). */
function detector(): Promise<Detector> {
  detectorP ??= import("barcode-detector/ponyfill").then((m) => {
    m.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? `${window.location.origin}/zxing_reader.wasm` : prefix + path,
      },
    });
    return new m.BarcodeDetector({ formats: ["qr_code"] }) as Detector;
  });
  return detectorP;
}

export function codeFromQr(raw: string): string | null {
  return parseVerifyPath(raw.trim());
}

export function Scanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function found(raw: string): boolean {
    const code = codeFromQr(raw);
    if (!code) {
      setMsg(SCAN.notStamper);
      return false;
    }
    setMsg(SCAN.found(code));
    router.push(`/v/${code}`);
    return true;
  }

  useEffect(() => {
    if (!stream || !video.current) return;
    const v = video.current;
    v.srcObject = stream;
    void v.play();
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        if (v.readyState >= 2) {
          const r = await (await detector()).detect(v);
          if (r[0] && found(r[0].rawValue)) return;
        }
      } catch {
        /* keep scanning */
      }
      setTimeout(tick, 250);
    };
    void tick();
    return () => {
      stop = true;
      for (const t of stream.getTracks()) t.stop();
    };
  }, [stream]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMsg(SCAN.noCamera);
      return;
    }
    try {
      setStream(
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }),
      );
    } catch {
      setMsg(SCAN.noCamera);
    }
  }

  async function fromFile(f: File) {
    try {
      const bmp = await createImageBitmap(f);
      const r = await (await detector()).detect(bmp);
      if (r[0]) found(r[0].rawValue);
      else setMsg(SCAN.nothing);
    } catch {
      setMsg(SCAN.nothing);
    }
  }

  return (
    <div className="scanner">
      {stream ? (
        <>
          <video ref={video} playsInline muted className="camera" />
          <button type="button" className="btn" onClick={() => setStream(null)}>
            {SCAN.stop}
          </button>
        </>
      ) : (
        <button type="button" className="btn primary" onClick={() => void start()}>
          {SCAN.start}
        </button>
      )}
      <label className="btn" htmlFor="qr-file">
        {SCAN.fromFile}
      </label>
      <input
        id="qr-file"
        type="file"
        accept="image/*"
        className="visually-hidden"
        data-testid="qr-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void fromFile(f);
        }}
      />
      {msg ? (
        <p role="status" data-testid="scan-msg">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
