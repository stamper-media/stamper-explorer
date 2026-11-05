import { type CaptureRecord, decodeRecord, fromBase64, recordHash } from "@stamper/core";
import type { Hex } from "viem";

/** The public CaptureRecord, accepted only when its bytes hash to the recordHash the chain holds. */
export type RecordCheck =
  | { state: "absent" }
  | { state: "ok"; record: CaptureRecord }
  | { state: "bad"; reason: "hash" | "decode" };

export function checkRecord(b64: string | null | undefined, onChain: Hex): RecordCheck {
  if (!b64) return { state: "absent" };
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(b64);
  } catch {
    return { state: "bad", reason: "decode" };
  }
  if (recordHash(bytes).toLowerCase() !== onChain.toLowerCase())
    return { state: "bad", reason: "hash" };
  try {
    return { state: "ok", record: decodeRecord(bytes) };
  } catch {
    return { state: "bad", reason: "decode" };
  }
}

/** "23.55° S" from hundredths of a degree (a cell edge), never more precise than the cell. */
export function degrees(e2: number, pos: string, neg: string): string {
  return `${(Math.abs(e2) / 100).toFixed(2)}° ${e2 < 0 ? neg : pos}`;
}
