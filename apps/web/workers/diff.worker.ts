/// <reference lib="webworker" />
import { diffPixels, type Pixels } from "../lib/diff";

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = (ev: MessageEvent<{ a: Pixels; b: Pixels }>) => {
  try {
    const r = diffPixels(ev.data.a, ev.data.b);
    scope.postMessage({ ok: true, ...r }, [r.diff.buffer]);
  } catch (e) {
    scope.postMessage({ ok: false, message: e instanceof Error ? e.message : String(e) });
  }
};
