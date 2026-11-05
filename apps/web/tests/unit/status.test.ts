import { describe, expect, it } from "vitest";
import { storageHealthSchema } from "../../lib/api";

/** A real GET /v1/health/storage body from stamper-services' api on Calibration (2026-11-03). */
const live = {
  chainId: 314159,
  focMode: "real",
  dataSets: {
    A: {
      dataSetId: "40026",
      live: true,
      listenerIsFwss: true,
      lastProvenEpoch: "4213466",
      nextChallengeEpoch: "4213703",
      provenThisPeriod: false,
      provingDeadline: "4213723",
      pdpEndEpoch: "0",
      lifecycleReserve: "409000000000000000",
      providerId: "9",
      viewOk: true,
    },
    B: {
      dataSetId: "40027",
      live: true,
      listenerIsFwss: true,
      lastProvenEpoch: "4213469",
      nextChallengeEpoch: "4213706",
      provenThisPeriod: false,
      provingDeadline: "4213726",
      pdpEndEpoch: "0",
      lifecycleReserve: "354000000000000000",
      providerId: "4",
      viewOk: true,
    },
  },
  runway: {
    fundedUntilEpoch: "6551531",
    days: 811.7659722222222,
    availableUsdfc: "6494217099234214140",
    lockupUsdfc: "2007925529724330095",
  },
  relayer: {
    address: "0x461CF9fb97d97182a3990a2628394B3fcD746F7a",
    balanceWei: "9999234487138094599",
  },
  sessionKey: { expiresAt: "2026-11-06T13:19:30.000Z", secondsLeft: 235384 },
  checkedAt: "2026-11-03T19:56:25.514Z",
};

describe("storage health (the status page)", () => {
  it("parses the api's real response", () => {
    const r = storageHealthSchema.safeParse(live);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.dataSets.A).toMatchObject({ dataSetId: "40026", live: true, providerId: "9" });
    expect(r.data.runway).toMatchObject({ days: 811.7659722222222 });
  });

  it("accepts a data set or a value the api could not read", () => {
    const r = storageHealthSchema.safeParse({
      ...live,
      dataSets: { A: live.dataSets.A, B: { error: "view reverted" } },
      runway: { error: "rpc timeout" },
      relayer: { address: live.relayer.address, balanceWei: { error: "rpc timeout" } },
    });
    expect(r.success).toBe(true);
  });
});
