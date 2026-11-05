import { defineConfig, devices } from "@playwright/test";

/**
 * Two modes:
 *  - PLAYWRIGHT_BASE_URL (+ STAMP_CODE): run against an already running stack (WP-12 local stack).
 *  - otherwise: build + start this app against tests/fixtures/server.ts. Ports come from
 *    E2E_WEB_PORT and FIXTURE_PORT (scripts/e2e.sh picks free ones).
 */
const external = process.env.PLAYWRIGHT_BASE_URL;
const webPort = process.env.E2E_WEB_PORT;
const fixturePort = process.env.FIXTURE_PORT;
if (!external && (!webPort || !fixturePort)) {
  throw new Error("set PLAYWRIGHT_BASE_URL, or E2E_WEB_PORT and FIXTURE_PORT (see scripts/e2e.sh)");
}
const fx = `http://127.0.0.1:${fixturePort}`;
const baseURL = external ?? `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["line"]],
  use: { baseURL, trace: "off", ...devices["Pixel 7"], viewport: { width: 360, height: 780 } },
  projects: [{ name: "chromium-mobile", use: { browserName: "chromium" } }],
  webServer: external
    ? undefined
    : [
        {
          command: "node --import tsx tests/fixtures/server.ts",
          url: `${fx}/fixture.json`,
          env: { FIXTURE_PORT: String(fixturePort) },
          reuseExistingServer: false,
          timeout: 60_000,
        },
        {
          command: `node scripts/copy-wasm.mjs && ./node_modules/.bin/next build && ./node_modules/.bin/next start -p ${webPort} -H 127.0.0.1`,
          url: `${baseURL}/about`,
          reuseExistingServer: false,
          timeout: 420_000,
          env: {
            NEXT_TELEMETRY_DISABLED: "1",
            NEXT_PUBLIC_CHAIN_ID: "31337",
            NEXT_PUBLIC_RPC_URLS: `${fx}/rpc1,${fx}/rpc2`,
            NEXT_PUBLIC_REGISTRY_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            NEXT_PUBLIC_RESOLVER_ADDRESS: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            NEXT_PUBLIC_API_URL: `${fx}/api`,
            NEXT_PUBLIC_FILBEAM_BASE: `${fx}/filbeam`,
            NEXT_PUBLIC_MIRROR_URL: `${fx}/mirror`,
            NEXT_PUBLIC_EXPLORERS: `blockscout=${fx}/blockscout,filfox=${fx}/filfox`,
          },
        },
      ],
});
