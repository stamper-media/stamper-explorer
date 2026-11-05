import { beforeAll, describe, expect, it } from "vitest";
import {
  buildSources,
  fetchOriginal,
  OriginalUnavailableError,
  orderedCandidates,
} from "../../lib/fetch-original";
import { type Fixture, makeFixture } from "../fixtures/stamp";

let f: Fixture;
beforeAll(async () => {
  f = await makeFixture();
});

type Route = { head?: number; get?: number; body?: Uint8Array };
function fakeFetch(routes: Record<string, Route>, log: string[]) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    log.push(`${method} ${url}`);
    const r = routes[url];
    if (!r) return new Response(null, { status: 404 });
    const status = method === "HEAD" ? (r.head ?? r.get ?? 200) : (r.get ?? 200);
    if (method === "HEAD" || status >= 300) return new Response(null, { status });
    return new Response((r.body ?? new Uint8Array()) as BodyInit, {
      status,
      headers: { "content-length": String(r.body?.length ?? 0) },
    });
  }) as typeof fetch;
}

const expectOf = (fx: Fixture) => ({ sha256: fx.stamp.contentHash, pieceCid: fx.stamp.pieceCid });

describe("fetchOriginal", () => {
  it("orders FilBeam → providers → mirror and builds URLs from config", () => {
    const s = buildSources(
      { filbeamBase: "https://fb.example", mirrorUrl: "https://m.example" },
      "bafkcid",
      {
        providers: ["https://sp.example/"],
      },
    );
    expect(orderedCandidates(s).map((c) => c.url)).toEqual([
      "https://fb.example/bafkcid",
      "https://sp.example/piece/bafkcid",
      "https://m.example/bafkcid",
    ]);
  });

  it("skips FilBeam on 402 and takes the provider, re-hashing both identifiers", async () => {
    const log: string[] = [];
    const progress: number[] = [];
    const r = await fetchOriginal(
      { filbeam: "https://fb/x", providers: ["https://sp/piece/x"], mirror: "https://m/x" },
      expectOf(f),
      (p) => progress.push(p.loaded),
      {
        fetch: fakeFetch(
          {
            "https://fb/x": { head: 402 },
            "https://sp/piece/x": { body: f.original },
            "https://m/x": { body: f.original },
          },
          log,
        ),
      },
    );
    expect(r.source).toBe("provider");
    expect(r.sha256Ok && r.pieceCidOk).toBe(true);
    expect(r.attempts[0]?.outcome).toMatch(/402/);
    expect(log.filter((l) => l.startsWith("GET"))).toEqual(["GET https://sp/piece/x"]);
    expect(progress.at(-1)).toBe(f.original.length);
  });

  it("falls through to the mirror when a provider serves other bytes", async () => {
    const log: string[] = [];
    const r = await fetchOriginal(
      { providers: ["https://sp/piece/x"], mirror: "https://m/x" },
      expectOf(f),
      undefined,
      {
        fetch: fakeFetch(
          { "https://sp/piece/x": { body: f.modified }, "https://m/x": { body: f.original } },
          log,
        ),
      },
    );
    expect(r.source).toBe("mirror");
    expect(r.sha256Ok).toBe(true);
  });

  it("tries GET when HEAD is not implemented (405)", async () => {
    const r = await fetchOriginal({ providers: ["https://sp/piece/x"] }, expectOf(f), undefined, {
      fetch: fakeFetch({ "https://sp/piece/x": { head: 405, body: f.original } }, []),
    });
    expect(r.source).toBe("provider");
  });

  it("returns a failed hash result rather than ORIGINAL when only bad bytes exist", async () => {
    const r = await fetchOriginal(
      { providers: [], mirror: "https://m/x" },
      expectOf(f),
      undefined,
      {
        fetch: fakeFetch({ "https://m/x": { body: f.modified } }, []),
      },
    );
    expect(r.sha256Ok).toBe(false);
  });

  it("throws OriginalUnavailableError when nothing serves", async () => {
    await expect(
      fetchOriginal(
        { filbeam: "https://fb/x", providers: ["https://sp/piece/x"] },
        expectOf(f),
        undefined,
        {
          fetch: fakeFetch({ "https://fb/x": { head: 402 } }, []),
        },
      ),
    ).rejects.toBeInstanceOf(OriginalUnavailableError);
  });
});
