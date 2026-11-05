import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { StampBundle } from "@stamper/contracts-abi";
import { stamperDomain } from "@stamper/core";
import { type Address, type Hex, zeroAddress, zeroHash } from "viem";
import { describe, expect, it } from "vitest";
import { reverifyCountersignature, reverifyDeviceSignature } from "../../lib/reverify";
import { makeFixture, REGISTRY } from "../fixtures/stamp";

type Vec = {
  name: string;
  keyInfo: { keyType: number; addr?: Address; x?: Hex; y?: Hex; rpIdHash?: Hex };
  claim: Record<string, string | number>;
  digest: Hex;
  sig: Hex;
  authData: Hex;
};
const vectors = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/claims.json", import.meta.url)), "utf8"),
) as { domain: { chainId: number; verifyingContract: Address }; claims: Vec[] };

function bundleOf(v: Vec, sig = v.sig): StampBundle {
  const c = v.claim;
  return {
    stamp: {
      contentHash: c.contentHash as Hex,
      pieceCid: c.pieceCid as Hex,
      contentLength: BigInt(c.contentLength as string),
      mediaKind: Number(c.mediaKind),
      capturedAt: BigInt(c.capturedAt as string),
      recordHash: c.recordHash as Hex,
      keyId: c.keyId as Hex,
      nonce: BigInt(c.nonce as string),
      flags: Number(c.flags),
      level: 0,
      countersigner: zeroAddress,
      registeredEpoch: 1n,
      code: 0,
      sig,
      authData: v.authData,
    },
    key: {
      keyType: v.keyInfo.keyType,
      platform: 1,
      level: 0,
      x: v.keyInfo.x ?? zeroHash,
      y: v.keyInfo.y ?? zeroHash,
      addr: v.keyInfo.addr ?? zeroAddress,
      rpIdHash: v.keyInfo.rpIdHash ?? zeroHash,
      attestationHash: zeroHash,
      registrar: zeroAddress,
      enrolledEpoch: 1n,
      expiresAt: 0n,
      revokedEpoch: 0n,
      revokeReason: 0,
    },
    bindings: [],
    derivatives: [],
    effectiveLevel: 0,
    registrarActiveFrom: 0n,
  };
}

describe("reverifyDeviceSignature with the core claim vectors", () => {
  const { chainId, verifyingContract } = vectors.domain;
  for (const v of vectors.claims) {
    it(`${v.name}: accepts the stored signature and rebuilds the claim`, () => {
      const r = reverifyDeviceSignature(bundleOf(v), v.digest, chainId as 31337, verifyingContract);
      expect(r.ok).toBe(true);
      expect(r.claimRebuilt).toBe(true);
    });
    it(`${v.name}: rejects a tampered signature`, () => {
      const flipped =
        `${v.sig.slice(0, 10)}${v.sig[10] === "0" ? "1" : "0"}${v.sig.slice(11)}` as Hex;
      expect(
        reverifyDeviceSignature(bundleOf(v, flipped), v.digest, 31337, verifyingContract).ok,
      ).toBe(false);
    });
  }
  it("vectors share the fixture domain", () => {
    expect(stamperDomain(31337, vectors.domain.verifyingContract).name).toBe("Stamper");
  });
});

describe("reverifyCountersignature", () => {
  it("recovers the registrar from supplied bytes and compares with state", async () => {
    const f = await makeFixture();
    const b = { stamp: f.stamp, key: f.key } as unknown as StampBundle;
    const r = reverifyCountersignature(b, 31337, REGISTRY, f.stampId, f.countersig);
    expect(r).toEqual({ ok: true, signer: f.registrar, method: "recovered" });
    const wrongLevel = `0x02${f.countersig.slice(4)}` as Hex;
    expect(reverifyCountersignature(b, 31337, REGISTRY, f.stampId, wrongLevel).ok).toBe(false);
    expect(reverifyCountersignature(b, 31337, REGISTRY, f.stampId).method).toBe("chain-state");
    const none = {
      stamp: { ...f.stamp, countersigner: zeroAddress },
      key: f.key,
    } as unknown as StampBundle;
    expect(reverifyCountersignature(none, 31337, REGISTRY, f.stampId).method).toBe("none");
  });
  it("re-checks the fixture's device signature", async () => {
    const f = await makeFixture();
    const b = { stamp: f.stamp, key: f.key } as unknown as StampBundle;
    expect(reverifyDeviceSignature(b, f.stampId, 31337, REGISTRY)).toEqual({
      ok: true,
      scheme: "secp256k1",
      claimRebuilt: true,
    });
  });
});
