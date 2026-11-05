/**
 * In-browser re-verification from `getStamp` / `getKey` state (DESIGN §8.2 item 4). The stamp id is the
 * EIP-712 digest of the capture claim, so the device signature is checked over it directly; the claim is
 * also rebuilt from the stored fields (deadline re-derived per core.claimDeadline) and compared.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import type { StampBundle } from "@stamper/contracts-abi";
import {
  claimDeadline,
  type DeviceKeyInfo,
  FLAG,
  hashCaptureClaim,
  hashCountersignature,
  KT,
  stamperDomain,
  verifyDeviceSignature,
} from "@stamper/core";
import { type Address, getAddress, type Hex, hexToBytes, keccak256, zeroAddress } from "viem";
import type { WebChainId } from "./config";

export type DeviceCheck = {
  ok: boolean;
  scheme: "secp256k1" | "p256" | "p256-appattest" | "erc1271" | "unknown";
  /** true when hashCaptureClaim(stored fields) reproduces the stamp id. */
  claimRebuilt: boolean;
};

export function keyInfoOf(key: StampBundle["key"]): DeviceKeyInfo {
  const kt = key.keyType;
  if (kt !== 0 && kt !== 1 && kt !== 2 && kt !== 3) throw new Error(`unknown keyType ${kt}`);
  return { keyType: kt, addr: key.addr, x: key.x, y: key.y, rpIdHash: key.rpIdHash };
}

const SCHEMES = {
  [KT.SECP256K1]: "secp256k1",
  [KT.P256_RAW]: "p256",
  [KT.P256_APPATTEST]: "p256-appattest",
  [KT.ERC1271]: "erc1271",
} as const;

export function reverifyDeviceSignature(
  bundle: StampBundle,
  stampId: Hex,
  chainId: WebChainId,
  registry: Address,
): DeviceCheck {
  const s = bundle.stamp;
  const kt = bundle.key.keyType;
  const scheme: DeviceCheck["scheme"] =
    kt === 0 || kt === 1 || kt === 2 || kt === 3 ? SCHEMES[kt] : "unknown";
  let claimRebuilt = false;
  try {
    const domain = stamperDomain(chainId, registry);
    // The deadline is not stored; try the flag's canonical window first, then the other one.
    const offline = (s.flags & FLAG.OFFLINE) !== 0;
    for (const off of [offline, !offline]) {
      const rebuilt = hashCaptureClaim(domain, {
        contentHash: s.contentHash,
        pieceCid: s.pieceCid,
        contentLength: s.contentLength,
        mediaKind: s.mediaKind as 1 | 2,
        capturedAt: s.capturedAt,
        recordHash: s.recordHash,
        keyId: s.keyId,
        nonce: s.nonce,
        flags: s.flags,
        deadline: claimDeadline(s.capturedAt, off),
      });
      if (rebuilt.toLowerCase() === stampId.toLowerCase()) {
        claimRebuilt = true;
        break;
      }
    }
  } catch {
    claimRebuilt = false;
  }
  if (scheme === "unknown" || scheme === "erc1271") return { ok: false, scheme, claimRebuilt };
  let ok = false;
  try {
    ok = verifyDeviceSignature(keyInfoOf(bundle.key), stampId, s.sig, s.authData, s.nonce);
  } catch {
    ok = false;
  }
  return { ok, scheme, claimRebuilt };
}

export type CountersigCheck = {
  ok: boolean;
  signer: Address;
  /** recovered: bytes supplied and recovered here; chain-state: the registry recovered it at registration. */
  method: "recovered" | "chain-state" | "none";
};

/** Sync secp256k1 recovery of a 65-byte r‖s‖v signature over a 32-byte digest. */
export function recoverAddress(digest: Hex, sig65: Hex): Address {
  const b = hexToBytes(sig65);
  if (b.length !== 65) throw new Error("signature must be 65 bytes");
  const v = b[64] as number;
  const bit = v >= 27 ? v - 27 : v;
  if (bit !== 0 && bit !== 1) throw new Error("bad recovery id");
  const pub = secp256k1.Signature.fromCompact(b.slice(0, 64))
    .addRecoveryBit(bit)
    .recoverPublicKey(hexToBytes(digest))
    .toRawBytes(false);
  return getAddress(`0x${keccak256(pub.slice(1)).slice(-40)}`);
}

/**
 * The registry does not store the countersignature bytes, only the recovered countersigner. When the
 * presentation api supplies the 66-byte `level ‖ sig`, it is recovered here and compared with state.
 */
export function reverifyCountersignature(
  bundle: StampBundle,
  chainId: WebChainId,
  registry: Address,
  stampId: Hex,
  countersig?: Hex,
): CountersigCheck {
  const signer = bundle.stamp.countersigner;
  if (signer === zeroAddress) return { ok: false, signer, method: "none" };
  if (countersig && /^0x[0-9a-fA-F]{132}$/.test(countersig)) {
    try {
      const level = Number.parseInt(countersig.slice(2, 4), 16);
      const digest = hashCountersignature(stamperDomain(chainId, registry), { stampId, level });
      const rec = recoverAddress(digest, `0x${countersig.slice(4)}`);
      return {
        ok: rec === getAddress(signer) && level === bundle.stamp.level,
        signer: rec,
        method: "recovered",
      };
    } catch {
      return { ok: false, signer, method: "recovered" };
    }
  }
  return { ok: true, signer, method: "chain-state" };
}
