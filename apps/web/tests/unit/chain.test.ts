import { beforeAll, describe, expect, it } from "vitest";
import { chainVerifyIO, InvalidCodeError, loadStamp, lookupByCode } from "../../lib/chain";
import { type Fixture, makeFixture } from "../fixtures/stamp";
import { mockReader } from "./helpers";

let f: Fixture;
beforeAll(async () => {
  f = await makeFixture();
});

describe("lib/chain against ABI-encoded eth_call fixtures", () => {
  it("looks a code up on both RPCs and reports agreement", async () => {
    const r = await lookupByCode(f.code9.toLowerCase(), mockReader(f));
    expect(r).toEqual({ stampId: f.stampId, rpcAgreement: true });
  });

  it("flags disagreeing RPCs", async () => {
    const r = await lookupByCode(f.code9, mockReader(f, 2, true));
    expect(r.rpcAgreement).toBe(false);
  });

  it("returns notRegistered for a valid unknown code", async () => {
    const other = f.code9 === "5VEBTVRAF" ? "6NJ9RNXCP" : "5VEBTVRAF";
    expect(await lookupByCode(other, mockReader(f))).toEqual({
      notRegistered: true,
      rpcAgreement: true,
    });
  });

  it("throws InvalidCodeError(check) for a wrong check symbol", async () => {
    const last = f.code9.at(-1) === "0" ? "1" : "0";
    const bad = f.code9.slice(0, 8) + last;
    await expect(lookupByCode(bad, mockReader(f))).rejects.toBeInstanceOf(InvalidCodeError);
    await expect(lookupByCode(bad, mockReader(f))).rejects.toMatchObject({ reason: "check" });
  });

  it("decodes the stamp bundle, bound slots, statuses, head and finality", async () => {
    const s = await loadStamp(f.stampId, mockReader(f));
    expect(s.stamp.contentHash).toBe(f.stamp.contentHash);
    expect(s.stamp.sig).toBe(f.stamp.sig);
    expect(s.key.addr).toBe(f.device);
    expect(s.boundSlots).toEqual([0, 1]);
    expect(s.bindingStatuses).toHaveLength(2);
    expect(s.bindingStatuses[1]?.providerId).toBe(2n);
    expect(s.head).toBe(5000n);
    expect(s.finalized).toBe(4000n);
    expect(s.effectiveLevel).toBe(1);
    expect(s.resolverFlag).toBe(0);
    expect(s.rpcAgreement).toBe(true);
  });

  it("chain IO answers the exact path", async () => {
    const io = chainVerifyIO(mockReader(f));
    expect(await io.firstStampOf(f.stamp.contentHash)).toBe(f.stampId);
    expect((await io.getStamp(f.stampId))?.code).toBe(f.code);
  });
});
