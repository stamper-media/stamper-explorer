import { createHash } from "node:crypto";
import {
  finalityState,
  normaliseCode,
  parseVerifyPath,
  pieceCidHex,
  pieceCidOf,
  qrPayload,
} from "@stamper/core";
import { describe, expect, it } from "vitest";
import { codeFromQr } from "../../components/Scanner";
import { parseConfig, parseExamples } from "../../lib/config";
import { CHAIN } from "../../lib/copy";
import { diffPixels } from "../../lib/diff";
import { epochToUtc, formatBytes, formatUtc, msToUtc } from "../../lib/format";
import { digestBytes } from "../../lib/hashing";
import { testPicture } from "../fixtures/png";

describe("code input normalisation (delegated to core)", () => {
  it("accepts lower case, hyphens, spaces and I/L/O confusables", () => {
    expect(normaliseCode("5veb-tvra-f")).toMatchObject({ ok: true, code9: "5VEBTVRAF" });
    expect(normaliseCode(" 5VEB TVRA F ")).toMatchObject({ ok: true });
    expect(normaliseCode("5VEBTVRAG")).toMatchObject({ ok: false, reason: "check" });
    expect(normaliseCode("5VEB")).toMatchObject({ ok: false, reason: "length" });
  });
  it("decodes QR payloads and verify URLs", () => {
    expect(codeFromQr(qrPayload("5VEBTVRAF"))).toBe("5VEBTVRAF");
    expect(codeFromQr("https://example.org/v/5veb-tvra-f")).toBe("5VEBTVRAF");
    expect(codeFromQr("hello")).toBeNull();
    expect(parseVerifyPath("/v/MR58TTN8D")).toBe("MR58TTN8D");
  });
});

describe("format", () => {
  it("converts epochs to UTC from the frozen genesis", () => {
    expect(epochToUtc(314, 0n)).toBe("2020-08-24 22:00:00 UTC");
    expect(epochToUtc(314159, 2n)).toBe(formatUtc(1667326380 + 60));
    expect(epochToUtc(31337, 7n)).toContain("local chain");
    expect(msToUtc(1_790_000_000_001n)).toBe("2026-09-21 14:13:20 UTC");
    expect(formatBytes(4 * 1024 * 1024)).toMatch(/^4\.00 MiB/);
  });
  it("labels finality states", () => {
    expect(CHAIN.states[finalityState(1000n, null, 990n)]).toBe("included");
    expect(CHAIN.states[finalityState(1000n, null, 900n)]).toBe("safe");
    expect(CHAIN.states[finalityState(1000n, 950n, 900n)]).toBe("final");
  });
});

describe("config", () => {
  it("parses the NEXT_PUBLIC env and derives defaults", () => {
    const c = parseConfig({
      NEXT_PUBLIC_CHAIN_ID: "314",
      NEXT_PUBLIC_RPC_URLS: "https://a.example/rpc, https://b.example/rpc",
      NEXT_PUBLIC_REGISTRY_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      NEXT_PUBLIC_FILBEAM_PAYER: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      NEXT_PUBLIC_EXPLORERS: "blockscout=https://bs.example,filfox=https://ff.example",
    });
    expect(c.rpcUrls).toHaveLength(2);
    expect(c.filbeamBase).toBe("https://0x70997970c51812dc3a010c7d01b50e0d17dc79c8.filbeam.io");
    expect(c.explorers.blockscout).toBe("https://bs.example");
    expect(c.explorers.pdp).toBe("https://pdp.filecoin.cloud/mainnet");
    expect(parseConfig({ NEXT_PUBLIC_CHAIN_ID: "314159" }).explorers.pdp).toBe(
      "https://pdp.filecoin.cloud/calibration",
    );
    expect(parseConfig({ NEXT_PUBLIC_CHAIN_ID: "31337" }).explorers).toEqual({});
    expect(c.origin).toMatch(/^https:\/\//);
    expect(c.apiUrl).toBeNull();
    expect(() => parseConfig({ NEXT_PUBLIC_CHAIN_ID: "1" })).toThrow(/CHAIN_ID/);
    expect(() => parseConfig({ NEXT_PUBLIC_RPC_URLS: "ftp://x" })).toThrow(/http/);
  });
  it("parses examples, with an optional copy file", () => {
    const [a, b, c] = parseExamples(
      "pdse-8wyh-h|Harbour|/examples/a.jpg|demo;PDSE8WYHH|Edited|/examples/b.jpg|demo|/examples/b-copy.jpg;PDSE8WYHH|Bad|x|demo|https://evil.example/c.jpg",
    );
    expect(a).toEqual({
      code9: "PDSE8WYHH",
      title: "Harbour",
      thumb: "/examples/a.jpg",
      demo: true,
      copy: null,
    });
    expect(b?.copy).toBe("/examples/b-copy.jpg");
    expect(c).toMatchObject({ thumb: null, copy: null });
  });
});

describe("hashing and diff", () => {
  it("streams sha256 and PieceCID equal to core's", async () => {
    const b = testPicture();
    const d = await digestBytes(b);
    expect(d.sha256).toBe(`0x${createHash("sha256").update(b).digest("hex")}`);
    expect(d.pieceCid).toBe(pieceCidHex(await pieceCidOf(b)));
    expect(d.length).toBe(b.length);
  });
  it("counts differing pixels", () => {
    const mk = (v: number) => ({
      data: new Uint8ClampedArray(16 * 16 * 4).fill(v),
      width: 16,
      height: 16,
    });
    expect(diffPixels(mk(10), mk(10)).differing).toBe(0);
    const b = mk(10);
    b.data.fill(250, 0, 64);
    const r = diffPixels(mk(10), b);
    expect(r.differing).toBe(16);
    expect(r.ratio).toBeCloseTo(16 / 256);
  });
  it("finds a broad low-contrast edit and ignores fine noise", () => {
    const W = 400;
    const H = 300;
    const mk = (f: (x: number, y: number) => number[]) => {
      const data = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) data.set([...f(x, y), 255], (y * W + x) * 4);
      return { data, width: W, height: H };
    };
    const water = (_x: number, y: number) => [30, 23, 50 + y / 30];
    const grain = (x: number, y: number) => ((x * 7 + y * 13) % 5) - 2;
    const original = mk((x, y) => {
      // a dark hull on dark water: below the per-pixel threshold everywhere
      if (x >= 150 && x < 250 && y >= 180 && y < 200) return [18, 12, 26];
      return water(x, y);
    });
    const removed = mk(water);
    const noisy = mk((x, y) =>
      Array.from(original.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3), (v) => v + grain(x, y)),
    );
    expect(diffPixels(original, noisy).differing).toBe(0);
    const r = diffPixels(original, removed);
    expect(r.differing).toBeGreaterThan(1000);
    // the red mark sits on the hull
    const at = (x: number, y: number) =>
      Array.from(r.diff.slice((y * W + x) * 4, (y * W + x) * 4 + 3));
    expect(at(200, 190)).toEqual([230, 30, 40]);
    expect(at(50, 50)).not.toEqual([230, 30, 40]);
  });
});
