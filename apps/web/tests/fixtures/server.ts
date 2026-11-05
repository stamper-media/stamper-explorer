/**
 * Fixture server for Playwright: two mock RPC endpoints, a FilBeam stand-in that answers 402, a storage
 * provider /piece route, a mirror and the WP-07 presentation api. Port from FIXTURE_PORT.
 */
import { createServer } from "node:http";
import { rpcHandler } from "./rpc";
import { makeFixture, presentation } from "./stamp";

const port = Number(process.env.FIXTURE_PORT);
if (!Number.isInteger(port) || port <= 0) throw new Error("FIXTURE_PORT is required");
const base = `http://127.0.0.1:${port}`;
const f = await makeFixture();
const rpc = rpcHandler(f);
const pres = presentation(f, base);

const server = createServer((req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-allow-methods", "GET,HEAD,POST,OPTIONS");
  res.setHeader("access-control-expose-headers", "content-length");
  if (req.method === "OPTIONS") return void res.writeHead(204).end();
  const url = new URL(req.url ?? "/", base);
  const p = url.pathname;
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "POST" && (p === "/rpc1" || p === "/rpc2")) {
    let data = "";
    req.on("data", (c) => {
      data += c;
    });
    req.on("end", () => json(200, rpc(JSON.parse(data))));
    return;
  }
  const bytes = (b: Uint8Array) => {
    res.writeHead(200, { "content-type": "image/png", "content-length": String(b.length) });
    res.end(req.method === "HEAD" ? undefined : Buffer.from(b));
  };
  if (p.startsWith("/filbeam/")) return void res.writeHead(402).end();
  if (p === `/sp/piece/${f.pieceCidText}` || p === `/mirror/${f.pieceCidText}`)
    return bytes(f.original);
  if (p === "/fixture.json") return json(200, { code9: f.code9, pieceCid: f.pieceCidText });
  if (p === "/api/v1/health/storage") {
    // the shape stamper-services' api serves (src/api/routes.ts, GET /v1/health/storage)
    return json(200, {
      chainId: 31337,
      focMode: "mock",
      dataSets: {
        A: {
          dataSetId: "1",
          live: true,
          listenerIsFwss: true,
          lastProvenEpoch: "120",
          nextChallengeEpoch: "180",
          provenThisPeriod: true,
          provingDeadline: "240",
          pdpEndEpoch: "0",
          providerId: "1",
        },
        B: { error: "provider view unavailable" },
      },
      runway: { fundedUntilEpoch: "250000", days: 120.5 },
      relayer: {
        address: "0x0000000000000000000000000000000000000001",
        balanceWei: "9999234487138094599",
      },
      sessionKey: { expiresAt: "2026-10-08T00:00:00.000Z", secondsLeft: 600000 },
      checkedAt: "2026-10-01T07:00:00.000Z",
    });
  }
  const m = /^\/api\/v1\/stamps\/([0-9A-Z]{9})$/.exec(p);
  if (m) return m[1] === f.code9 ? json(200, pres) : json(404, { error: "NotRegistered" });
  json(404, { error: "NotFound" });
});
server.listen(port, "127.0.0.1", () => console.log(`fixture server on ${base} code ${f.code9}`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
