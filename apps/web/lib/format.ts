import { epochToUnix } from "@stamper/core";
import type { WebChainId } from "./config";

/** `2026-10-01 12:00:30 UTC` */
export function formatUtc(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) return "—";
  return `${new Date(unixSeconds * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

/** Chain epoch → UTC (`block.timestamp = genesis + 30·epoch`); a local chain has no fixed genesis. */
export function epochToUtc(chainId: WebChainId, epoch: bigint): string {
  if (chainId === 31337) return `epoch ${epoch} (local chain)`;
  return formatUtc(epochToUnix(chainId, epoch));
}

/** Device `capturedAt` is unix milliseconds (uint64). */
export function msToUtc(ms: bigint | string | number): string {
  const n = typeof ms === "bigint" ? Number(ms) : Number(ms);
  return Number.isFinite(n) ? formatUtc(Math.floor(n / 1000)) : "—";
}

export function isoToUtc(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : formatUtc(Math.floor(t / 1000));
}

export function formatBytes(n: bigint | number): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${i === 0 ? x : x.toFixed(x < 10 ? 2 : 1)} ${units[i]} (${v.toLocaleString("en-US")} bytes)`;
}

export function shortHex(h: string, keep = 6): string {
  return h.length <= keep * 2 + 2 ? h : `${h.slice(0, keep + 2)}…${h.slice(-keep)}`;
}

export function percent(ratio: number): string {
  return `${(ratio * 100).toFixed(ratio < 0.001 && ratio > 0 ? 3 : 2)} %`;
}

/** JSON with bigints as decimal strings (plan §4.1 wire encoding). */
export function toJson(value: unknown, space = 2): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), space);
}
