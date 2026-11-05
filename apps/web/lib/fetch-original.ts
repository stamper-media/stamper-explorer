/**
 * Fetches the original and re-hashes it before the word ORIGINAL may render. Sources are probed with a
 * parallel HEAD race and taken in priority order: FilBeam (402 ⇒ skip, payer has no CDN egress) →
 * storage-provider `/piece/<cid>` URLs → Stamper's mirror. A source whose bytes do not hash to the
 * registered values is skipped in favour of the next one.
 */
import type { Hex } from "viem";
import type { WebConfig } from "./config";
import { createInlineHasher, type StreamHasher } from "./hashing";

export type SourceKind = "filbeam" | "provider" | "mirror";
export type OriginalSources = {
  filbeam?: string | null;
  providers: string[];
  mirror?: string | null;
};
export type FetchProgress = {
  source: SourceKind;
  url: string;
  loaded: number;
  total: number | null;
};
export type Attempt = { source: SourceKind; url: string; outcome: string };

export type FetchOriginalResult = {
  blob: Blob;
  source: SourceKind;
  url: string;
  sha256: Hex;
  pieceCid: Hex;
  sha256Ok: boolean;
  pieceCidOk: boolean;
  attempts: Attempt[];
};

export class OriginalUnavailableError extends Error {
  constructor(readonly attempts: Attempt[]) {
    super(`original unavailable from ${attempts.length} source(s)`);
    this.name = "OriginalUnavailableError";
  }
}

export type FetchOriginalOptions = {
  fetch?: typeof fetch;
  makeHasher?: () => StreamHasher | Promise<StreamHasher>;
  headTimeoutMs?: number;
  signal?: AbortSignal;
  mime?: string;
};

/** Builds full URLs from config (chain-only path) plus optional presentation hints from the api. */
export function buildSources(
  cfg: Pick<WebConfig, "filbeamBase" | "mirrorUrl">,
  pieceCidText: string,
  hints?: { filbeam?: string; providers?: string[]; mirror?: string },
): OriginalSources {
  const cid = encodeURIComponent(pieceCidText);
  const providers = (hints?.providers ?? []).map((p) =>
    /\/piece\//.test(p) ? p : `${p.replace(/\/+$/, "")}/piece/${cid}`,
  );
  return {
    filbeam: hints?.filbeam ?? (cfg.filbeamBase ? `${cfg.filbeamBase}/${cid}` : null),
    providers,
    mirror: hints?.mirror ?? (cfg.mirrorUrl ? `${cfg.mirrorUrl}/${cid}` : null),
  };
}

export function orderedCandidates(s: OriginalSources): Array<{ source: SourceKind; url: string }> {
  const out: Array<{ source: SourceKind; url: string }> = [];
  if (s.filbeam) out.push({ source: "filbeam", url: s.filbeam });
  for (const p of s.providers) out.push({ source: "provider", url: p });
  if (s.mirror) out.push({ source: "mirror", url: s.mirror });
  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

async function head(
  f: typeof fetch,
  url: string,
  ms: number,
  outer?: AbortSignal,
): Promise<number> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const onAbort = () => ctl.abort();
  outer?.addEventListener("abort", onAbort);
  try {
    const r = await f(url, { method: "HEAD", signal: ctl.signal, redirect: "follow" });
    return r.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(t);
    outer?.removeEventListener("abort", onAbort);
  }
}

export async function fetchOriginal(
  sources: OriginalSources,
  expect: { sha256: Hex; pieceCid: Hex },
  onProgress?: (p: FetchProgress) => void,
  opts: FetchOriginalOptions = {},
): Promise<FetchOriginalResult> {
  const f = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const makeHasher = opts.makeHasher ?? createInlineHasher;
  const list = orderedCandidates(sources);
  const heads = list.map((c) => head(f, c.url, opts.headTimeoutMs ?? 8_000, opts.signal));
  const attempts: Attempt[] = [];
  let firstBad: FetchOriginalResult | null = null;

  for (let i = 0; i < list.length; i++) {
    const c = list[i] as { source: SourceKind; url: string };
    const st = await (heads[i] as Promise<number>);
    if (st === 402) {
      attempts.push({ ...c, outcome: "402 payment required (skipped)" });
      continue;
    }
    // 405/501: the source does not implement HEAD; try GET anyway.
    if (!(st >= 200 && st < 400) && st !== 405 && st !== 501) {
      attempts.push({ ...c, outcome: st === 0 ? "unreachable" : `HEAD ${st}` });
      continue;
    }
    try {
      const res = await f(c.url, { signal: opts.signal, redirect: "follow" });
      if (!res.ok || !res.body) {
        attempts.push({ ...c, outcome: `GET ${res.status}` });
        continue;
      }
      const totalHeader = Number(res.headers.get("content-length"));
      const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : null;
      const hasher = await makeHasher();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      const reader = res.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          await hasher.update(value);
          onProgress?.({ ...c, loaded, total });
        }
      } catch (e) {
        hasher.abort?.();
        throw e;
      }
      const d = await hasher.digest();
      const result: FetchOriginalResult = {
        blob: new Blob(chunks as BlobPart[], {
          type: opts.mime ?? res.headers.get("content-type") ?? "application/octet-stream",
        }),
        ...c,
        sha256: d.sha256,
        pieceCid: d.pieceCid,
        sha256Ok: d.sha256.toLowerCase() === expect.sha256.toLowerCase(),
        pieceCidOk: d.pieceCid.toLowerCase() === expect.pieceCid.toLowerCase(),
        attempts,
      };
      if (result.sha256Ok && result.pieceCidOk) {
        attempts.push({ ...c, outcome: "ok" });
        return result;
      }
      attempts.push({ ...c, outcome: "bytes do not hash to the registered values" });
      firstBad ??= result;
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      attempts.push({ ...c, outcome: e instanceof Error ? e.message : String(e) });
    }
  }
  if (firstBad) return firstBad;
  throw new OriginalUnavailableError(attempts);
}
