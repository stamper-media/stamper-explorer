/**
 * A self-consistent registered stamp: real secp256k1 device signature and registrar countersignature
 * over a generated PNG, with chain state shaped exactly like StampRegistry's getters.
 */
import { createHash } from "node:crypto";
import {
  captureClaimTypes,
  captureCountersignatureTypes,
  claimDeadline,
  deriveCode,
  encodeCode,
  hashCaptureClaim,
  keyIdFromAddress,
  pieceCidHex,
  pieceCidOf,
  pieceCidString,
  stamperDomain,
} from "@stamper/core";
import { type Address, type Hex, keccak256, toHex, zeroAddress, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { testPicture } from "./png";

export const CHAIN_ID = 31337 as const;
export const REGISTRY: Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const RESOLVER: Address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const DEVICE_PK: Hex = "0x0101010101010101010101010101010101010101010101010101010101010102";
const REGISTRAR_PK: Hex = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const SP_A: Address = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const SP_B: Address = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
const BINDER: Address = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

export type Fixture = Awaited<ReturnType<typeof makeFixture>>;

function sha256Hex(b: Uint8Array): Hex {
  return `0x${createHash("sha256").update(b).digest("hex")}`;
}

export async function makeFixture() {
  const original = testPicture();
  const modified = testPicture(96, 64, true);
  const device = privateKeyToAccount(DEVICE_PK);
  const registrar = privateKeyToAccount(REGISTRAR_PK);
  const domain = stamperDomain(CHAIN_ID, REGISTRY);
  const cid = await pieceCidOf(original);
  const capturedAt = 1_790_000_000_001n;
  const claim = {
    contentHash: sha256Hex(original),
    pieceCid: pieceCidHex(cid),
    contentLength: BigInt(original.length),
    mediaKind: 1 as const,
    capturedAt,
    recordHash: keccak256(toHex("fixture-record")),
    keyId: keyIdFromAddress(device.address),
    nonce: 7n,
    flags: 0,
    deadline: claimDeadline(capturedAt, false),
  };
  const stampId = hashCaptureClaim(domain, claim);
  const sig = await device.signTypedData({
    domain,
    types: captureClaimTypes,
    primaryType: "CaptureClaim",
    message: claim,
  });
  const level = 1;
  const csSig = await registrar.signTypedData({
    domain,
    types: captureCountersignatureTypes,
    primaryType: "CaptureCountersignature",
    message: { stampId, level },
  });
  const countersig = `0x${level.toString(16).padStart(2, "0")}${csSig.slice(2)}` as Hex;
  const code = deriveCode(stampId, () => false).code;
  const code9 = encodeCode(code);
  const registeredEpoch = 1000n;
  const stamp = {
    contentHash: claim.contentHash,
    pieceCid: claim.pieceCid,
    contentLength: claim.contentLength,
    mediaKind: 1,
    capturedAt,
    recordHash: claim.recordHash,
    keyId: claim.keyId,
    nonce: claim.nonce,
    flags: 0,
    level,
    countersigner: registrar.address,
    registeredEpoch,
    code: Number(code),
    sig,
    authData: "0x" as Hex,
  };
  const key = {
    keyType: 0,
    platform: 1,
    level: 1,
    x: zeroHash,
    y: zeroHash,
    addr: device.address,
    rpIdHash: zeroHash,
    attestationHash: keccak256(toHex("attestation")),
    registrar: registrar.address,
    enrolledEpoch: 900n,
    expiresAt: 4_000_000_000n,
    revokedEpoch: 0n,
    revokeReason: 0,
  };
  const emptyBinding = {
    asset: 0,
    setId: 0n,
    pieceId: 0n,
    provider: zeroAddress as Address,
    boundBy: zeroAddress as Address,
    boundEpoch: 0n,
    trusted: false,
  };
  const bindings = Array.from({ length: 8 }, () => ({ ...emptyBinding }));
  bindings[0] = {
    asset: 0,
    setId: 1n,
    pieceId: 0n,
    provider: SP_A,
    boundBy: BINDER,
    boundEpoch: 1010n,
    trusted: true,
  };
  bindings[1] = {
    asset: 0,
    setId: 2n,
    pieceId: 0n,
    provider: SP_B,
    boundBy: BINDER,
    boundEpoch: 1011n,
    trusted: true,
  };
  const status = (providerId: bigint) => ({
    dataSetLive: true,
    pieceLive: true,
    cidMatches: true,
    listenerIsFWSS: true,
    lastProvenEpoch: 4900n,
    nextChallengeEpoch: 5100n,
    viewOk: true,
    provenThisPeriod: true,
    provingDeadline: 5880n,
    pdpEndEpoch: 0n,
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address,
    providerId,
  });
  const emptyStatus = {
    ...status(0n),
    dataSetLive: false,
    pieceLive: false,
    cidMatches: false,
    listenerIsFWSS: false,
    viewOk: false,
    provenThisPeriod: false,
    lastProvenEpoch: 0n,
    nextChallengeEpoch: 0n,
    provingDeadline: 0n,
    payer: zeroAddress,
  };
  const bindingStatuses = [status(1n), status(2n), ...Array.from({ length: 6 }, () => emptyStatus)];
  return {
    original,
    modified,
    domain,
    claim,
    stampId,
    countersig,
    code,
    code9,
    pieceCidText: pieceCidString(cid),
    stamp,
    key,
    bindings,
    bindingStatuses,
    effectiveLevel: 1,
    registrarActiveFrom: 1n,
    head: 5000n,
    finalized: 4000n,
    resolverFlag: 0,
    device: device.address,
    registrar: registrar.address,
  };
}

/** WP-07 StampPresentation for the fixture, with provider/mirror URLs on `base`. */
export function presentation(f: Fixture, base: string) {
  return {
    code9: f.code9,
    stampId: f.stampId,
    status: "stored",
    finality: "final",
    level: 1,
    effectiveLevel: 1,
    tier: { headline: "x", means: "x", doesNotMean: "x" },
    footer: "x",
    flags: [],
    resolverFlag: null,
    mediaKind: 1,
    mime: "image/png",
    contentHash: f.stamp.contentHash,
    pieceCid: f.pieceCidText,
    pieceCidHex: f.stamp.pieceCid,
    contentLength: f.stamp.contentLength.toString(),
    width: 96,
    height: 64,
    capturedAt: "2026-09-21T13:33:20.001Z",
    receivedAt: "2026-09-21T13:33:25.000Z",
    registeredEpoch: "1000",
    registerTx: `0x${"ab".repeat(32)}`,
    countersigner: f.registrar,
    keyId: f.stamp.keyId,
    keyType: 0,
    registrar: f.registrar,
    renditions: {},
    derivatives: [],
    bindings: [0, 1].map((slot) => ({
      slot,
      asset: 0,
      dataSetId: String(slot + 1),
      pieceId: "0",
      providerId: String(slot + 1),
      serviceUrl: `${base}/sp`,
      boundEpoch: String(1010 + slot),
      lastProbeAt: "2026-10-01T08:00:00.000Z",
      lastOkAt: "2026-10-01T08:00:00.000Z",
      probeFailures: 0,
    })),
    originalSources: {
      filbeam: `${base}/filbeam/${f.pieceCidText}`,
      providers: [`${base}/sp`],
      mirror: `${base}/mirror/${f.pieceCidText}`,
    },
    storageState: "bound",
    explorers: { blockscout: `${base}/blockscout`, filfox: `${base}/filfox` },
    countersig: f.countersig,
  };
}
