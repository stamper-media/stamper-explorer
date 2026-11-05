import { decide, type VerifyIO } from "@stamper/core";
import { zeroHash } from "viem";
import { describe, expect, it } from "vitest";
import type { LoadedStamp } from "../../lib/chain";
import { checkCopy, noticesFor, tierInputFrom, viewFor } from "../../lib/verdict";

const A = `0x${"aa".repeat(32)}` as const;
const S = `0x${"11".repeat(32)}` as const;
const io = (over: Partial<VerifyIO> = {}): VerifyIO => ({
  firstStampOf: async (h) => (h === A ? S : zeroHash),
  stampByDerivativeHash: async () => zeroHash,
  stampByCode: async () => S,
  getStamp: async () => ({ contentHash: A, pieceCid: "0x01", code: 0x123n }),
  ...over,
});

describe("verdict mapping", () => {
  it("maps each outcome to the core label and a screen", async () => {
    const exact = await decide({ sha256: A }, io());
    expect(viewFor(exact)).toMatchObject({ tone: "original" });
    expect(viewFor(exact).label).toMatch(/^ORIGINAL/);
    const related = await decide(
      { sha256: `0x${"bb".repeat(32)}` },
      io({ typedCode: "5VEBTVRAF" }),
    );
    expect(viewFor(related)).toMatchObject({ tone: "related", screen: "mismatch" });
    expect(viewFor(related).label).toMatch(/RELATED TO .* — COMPARE/);
    expect(
      viewFor({
        verdict: "RELATED_COMPARE",
        path: "perceptual",
        candidates: [
          { stampId: S, distance: 3 },
          { stampId: A, distance: 4 },
        ],
      }).screen,
    ).toBe("several-candidates");
    expect(viewFor({ verdict: "NOT_REGISTERED", path: "none" })).toMatchObject({
      tone: "none",
      screen: "not-registered",
    });
    expect(
      viewFor({ verdict: "STAMPER_MARKED_COPY", path: "derivative", code9: "5VEBTVRAF" }).tone,
    ).toBe("marked");
  });

  it("never asks the api when the chain answers", async () => {
    let called = false;
    const api = {
      base: "http://x",
      submitUpload: async () => {
        called = true;
        return { ok: false as const, status: 0, error: "" };
      },
    };
    const r = await checkCopy({ sha256: A }, io(), { api: api as never, file: new Blob([]) });
    expect(r.verdict).toBe("ORIGINAL");
    expect(r.via).toBe("chain");
    expect(called).toBe(false);
  });

  it("uses the api job for watermark / perceptual candidates", async () => {
    const api = {
      base: "http://x",
      submitUpload: async () => ({ ok: true as const, data: { jobId: "j" } }),
      waitForJob: async () => ({
        ok: true as const,
        data: {
          status: "done" as const,
          result: {
            verdict: "RELATED_COMPARE" as const,
            path: "perceptual",
            candidates: [{ stampId: S, distance: 5, code9: "5VEBTVRAF" }],
          },
        },
      }),
    };
    const r = await checkCopy({ sha256: `0x${"cc".repeat(32)}` }, io(), {
      api: api as never,
      file: new Blob([]),
    });
    expect(r).toMatchObject({ verdict: "RELATED_COMPARE", via: "api", path: "perceptual" });
    expect(r.candidates).toEqual([{ stampId: S, distance: 5, code9: "5VEBTVRAF" }]);
  });
});

describe("notices and tier input", () => {
  const base = {
    stamp: { registeredEpoch: 100n, flags: 2, countersigner: `0x${"01".repeat(20)}` },
    key: { revokedEpoch: 0n, registrar: `0x${"02".repeat(20)}`, keyType: 0 },
    registrarActiveFrom: 5n,
    effectiveLevel: 1,
    resolverFlag: 0,
    boundSlots: [0],
  } as unknown as LoadedStamp;
  it("emits the designed notices", () => {
    expect(noticesFor(base)).toEqual([]);
    expect(noticesFor({ ...base, boundSlots: [] })).toEqual(["proof-pending"]);
    expect(noticesFor({ ...base, resolverFlag: 1 })).toEqual(["withdrawn"]);
    expect(noticesFor({ ...base, resolverFlag: 4 })).toEqual(["rejected"]);
    expect(noticesFor({ ...base, key: { ...base.key, revokedEpoch: 200n } })).toEqual([
      "key-revoked",
    ]);
    expect(noticesFor({ ...base, registrarActiveFrom: 0n })).toEqual(["registrar-removed"]);
  });
  it("builds the tier input from chain state", () => {
    expect(tierInputFrom(base)).toEqual({
      level: 1,
      keyType: 0,
      countersigned: true,
      revokedBeforeStamp: false,
      registrarRemoved: false,
      offline: true,
      serverComputedCid: false,
    });
    expect(
      tierInputFrom({ ...base, key: { ...base.key, revokedEpoch: 50n } }).revokedBeforeStamp,
    ).toBe(true);
  });
});
