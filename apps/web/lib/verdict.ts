/**
 * Verdict ladder glue: core.decide() with chain IO for the exact and derivative paths (no api needed);
 * the api's verify job only for watermark / perceptual search. Maps decisions to copy and screens.
 */
import {
  type Decision,
  decide,
  FLAG,
  type TierInput,
  type VerifyIO,
  verdictLabel,
} from "@stamper/core";
import { type Hex, zeroAddress } from "viem";
import type { ApiClient } from "./api";
import type { LoadedStamp } from "./chain";
import type { FailureKind } from "./copy";

export type Tone = "original" | "marked" | "related" | "none";
export type VerdictView = { label: string; tone: Tone; screen?: FailureKind };

export function viewFor(d: Decision): VerdictView {
  switch (d.verdict) {
    case "ORIGINAL":
      return { label: verdictLabel("ORIGINAL", d.code9), tone: "original" };
    case "STAMPER_MARKED_COPY":
      return { label: verdictLabel("STAMPER_MARKED_COPY", d.code9), tone: "marked" };
    case "RELATED_COMPARE": {
      const several = (d.candidates?.length ?? 0) > 1;
      return {
        label: verdictLabel("RELATED_COMPARE", d.code9),
        tone: "related",
        screen: several ? "several-candidates" : "mismatch",
      };
    }
    default:
      return { label: verdictLabel("NOT_REGISTERED"), tone: "none", screen: "not-registered" };
  }
}

export function tierInputFrom(s: LoadedStamp): TierInput {
  const k = s.key;
  return {
    level: s.effectiveLevel,
    keyType: k.keyType,
    countersigned: s.stamp.countersigner !== zeroAddress,
    revokedBeforeStamp: k.revokedEpoch !== 0n && k.revokedEpoch <= s.stamp.registeredEpoch,
    registrarRemoved: k.registrar !== zeroAddress && s.registrarActiveFrom === 0n,
    offline: (s.stamp.flags & FLAG.OFFLINE) !== 0,
    serverComputedCid: (s.stamp.flags & FLAG.PIECECID_SERVER_COMPUTED) !== 0,
  };
}

/** Resolver flags (StampResolver.Flag) that stop the original from being served. */
export const WITHDRAWN_FLAGS = new Set([1, 2, 4]);

/** Designed notices that apply to a loaded stamp, in display order. */
export function noticesFor(s: LoadedStamp): FailureKind[] {
  const out: FailureKind[] = [];
  if (WITHDRAWN_FLAGS.has(s.resolverFlag))
    out.push(s.resolverFlag === 4 ? "rejected" : "withdrawn");
  if (s.key.revokedEpoch !== 0n && s.key.revokedEpoch > s.stamp.registeredEpoch)
    out.push("key-revoked");
  if (s.resolverFlag === 5 || (s.key.registrar !== zeroAddress && s.registrarActiveFrom === 0n)) {
    out.push("registrar-removed");
  }
  if (s.boundSlots.length === 0) out.push("proof-pending");
  return out;
}

export type Candidate = { stampId: Hex; distance: number; code9?: string };
export type CopyCheck = Omit<Decision, "candidates"> & {
  candidates?: Candidate[];
  via: "chain" | "api";
};

/**
 * Checks a copy: exact and derivative hits come from eth_call only. Otherwise, with a typed code the
 * ladder answers RELATED (compare); without one the api's verify job may find watermark / perceptual
 * candidates (never an auto-pick).
 */
export async function checkCopy(
  copy: { sha256: Hex; pieceCid?: Hex },
  io: VerifyIO,
  opts: { api?: ApiClient; file?: Blob } = {},
): Promise<CopyCheck> {
  const d = await decide(copy, io);
  if (d.verdict !== "NOT_REGISTERED" || !opts.api?.base || !opts.file)
    return { ...d, via: "chain" };
  const sub = await opts.api.submitUpload(opts.file);
  if (!sub.ok) return { ...d, via: "chain" };
  const job = await opts.api.waitForJob(sub.data.jobId);
  const r = job.ok ? job.data.result : undefined;
  if (r?.verdict !== "RELATED_COMPARE") return { ...d, via: "chain" };
  const candidates = (r.candidates ?? []).map(
    (c): Candidate => ({
      stampId: c.stampId as Hex,
      distance: c.distance,
      ...(c.code9 ? { code9: c.code9 } : {}),
    }),
  );
  return {
    verdict: "RELATED_COMPARE",
    path: r.path === "watermark" ? "watermark" : "perceptual",
    ...(r.stampId ? { stampId: r.stampId as Hex } : {}),
    ...(r.code9 ? { code9: r.code9 } : {}),
    candidates,
    via: "api",
  };
}
