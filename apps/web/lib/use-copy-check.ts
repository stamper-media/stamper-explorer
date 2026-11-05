"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ApiClient } from "./api";
import { chainVerifyIO, makeReader } from "./chain";
import { getConfig } from "./config";
import { HOME } from "./copy";
import { handOff } from "./handoff";
import { type Candidate, type CopyCheck, checkCopy } from "./verdict";
import { hashBlob } from "./worker-hasher";

/** Stamps a related copy can be compared with: the job's candidates, else the one stamp it named. */
export function compareTargets(r: CopyCheck): Partial<Candidate>[] {
  if (r.verdict !== "RELATED_COMPARE") return [];
  if (r.candidates && r.candidates.length > 0) return r.candidates;
  return r.code9 ? [{ code9: r.code9 }] : [];
}

/** The one stamp a checked copy points to, when there is exactly one; null when none or several. */
export function soleStamp(r: CopyCheck): string | null {
  const targets = compareTargets(r);
  if (targets.length === 1) return targets[0]?.code9 ?? null;
  if (targets.length === 0 && r.code9) return r.code9;
  return null;
}

/**
 * "Check a copy": hash in this browser, exact/derivative from chain state, then the api search.
 * When the copy points to exactly one stamp, that stamp's page opens at once with the copy handed
 * over, so it draws the comparison and diff map without another click. Otherwise the result is
 * returned for the page to show (several candidates are listed, never auto-picked).
 */
export function useCopyCheck() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<CopyCheck | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(
    async (f: File): Promise<void> => {
      setError(null);
      setResult(null);
      setFile(f);
      try {
        const cfg = getConfig();
        setBusy(HOME.hashing);
        const d = await hashBlob(f);
        setBusy(HOME.searching);
        const r = await checkCopy(d, chainVerifyIO(makeReader(cfg)), {
          api: new ApiClient(cfg.apiUrl),
          file: f,
        });
        const code9 = soleStamp(r);
        if (code9) {
          setBusy(HOME.opening);
          handOff(code9, f);
          router.push(`/v/${code9}`);
          return; // the stamp page takes over; busy stays on until it does
        }
        setResult(r);
        setBusy(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(null);
      }
    },
    [router],
  );

  /** An example chip that carries a copy: fetch it from this site and check it as if dropped. */
  const checkPath = useCallback(
    async (path: string): Promise<void> => {
      setError(null);
      setResult(null);
      setBusy(HOME.loadingExample);
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
        const blob = await res.blob();
        await check(new File([blob], path.split("/").pop() ?? "copy", { type: blob.type }));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(null);
      }
    },
    [check],
  );

  return { busy, result, file, error, check, checkPath };
}
