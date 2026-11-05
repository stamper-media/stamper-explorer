import { expect, type Page, test } from "@playwright/test";
import { containsBannedWord, qrPayload } from "@stamper/core";
import QRCode from "qrcode";
import { makeFixture } from "../fixtures/stamp";

const external = !!process.env.PLAYWRIGHT_BASE_URL;
const fx = `http://127.0.0.1:${process.env.FIXTURE_PORT}`;
let code = process.env.STAMP_CODE ?? "";
let fixture: Awaited<ReturnType<typeof makeFixture>>;

test.beforeAll(async () => {
  fixture = await makeFixture();
  if (!external) code = fixture.code9;
  if (!code) throw new Error("STAMP_CODE is required with PLAYWRIGHT_BASE_URL");
});

async function bodyIsClean(page: Page) {
  const t = await page.locator("body").innerText();
  expect(containsBannedWord(t), t).toBeNull();
}

test("exact path: ORIGINAL only after the original is fetched and re-hashed", async ({ page }) => {
  await page.goto(`/v/${code}`);
  await expect(page.getByTestId("source-line")).toContainText("hash agrees with chain", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("verdict")).toContainText("ORIGINAL");
  await expect(page.getByTestId("sig-line")).toContainText("signature re-checked in this browser");
  const storage = page.getByTestId("storage-panel");
  await expect(storage.getByTestId("binding")).toHaveCount(2);
  await expect(storage.getByTestId("probe-line").first()).toContainText("last retrieval check:");
  await expect(page.getByTestId("footer")).toContainText("Developed by Tinfoil");
  await bodyIsClean(page);
  // 360 px: no horizontal scroll
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the exact verdict renders with the api blocked; presentation degrades", async ({ page }) => {
  test.skip(external, "needs the fixture api URL");
  await page.route(`${fx}/api/**`, (r) => r.abort());
  await page.goto(`/v/${code}`);
  await expect(page.getByTestId("verdict")).toContainText("ORIGINAL", { timeout: 30_000 });
  await expect(page.getByTestId("probe-line").first()).toContainText("not available");
  await expect(page.getByTestId("served-by")).toContainText("mirror");
});

test("dropping a modified copy shows RELATED TO <code> — COMPARE with the diff overlay", async ({
  page,
}) => {
  await page.goto(`/v/${code}`);
  await expect(page.getByTestId("verdict")).toContainText("ORIGINAL", { timeout: 30_000 });
  await page.getByTestId("file-input").setInputFiles({
    name: "copy.png",
    mimeType: "image/png",
    buffer: Buffer.from(fixture.modified),
  });
  await expect(page.getByTestId("verdict")).toContainText(/RELATED TO .* — COMPARE/, {
    timeout: 30_000,
  });
  await expect(page.getByTestId("failure-mismatch")).toBeVisible();
  await expect(page.getByTestId("diff-overlay")).toBeVisible();
  await expect(page.getByTestId("compare-slider")).toBeVisible();
  await bodyIsClean(page);
});

test("a wrong check symbol shows the Invalid code screen", async ({ page }) => {
  const bad = code.slice(0, 8) + (code.at(-1) === "0" ? "1" : "0");
  await page.goto(`/v/${bad}`);
  await expect(page.getByTestId("failure-invalid-code")).toBeVisible();
});

test("an unknown valid code shows the Not registered screen", async ({ page }) => {
  const other = code === "5VEBTVRAF" ? "6NJ9RNXCP" : "5VEBTVRAF";
  await page.goto(`/v/${other}`);
  await expect(page.getByTestId("failure-not-registered")).toBeVisible({ timeout: 30_000 });
  await bodyIsClean(page);
});

test("the scan page decodes a rendered QR picture and opens the stamp", async ({ page }) => {
  const png = await QRCode.toBuffer(qrPayload(code), {
    errorCorrectionLevel: "M",
    margin: 4,
    scale: 8,
  });
  await page.goto("/scan");
  await page
    .getByTestId("qr-file")
    .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: png });
  await page.waitForURL(new RegExp(`/v/${code}$`), { timeout: 30_000 });
});

test("landing, status and about pages render clean copy", async ({ page }) => {
  for (const path of ["/", "/about", "/status"]) {
    await page.goto(path);
    await expect(page.getByTestId("footer")).toBeVisible();
    if (path === "/status" && !external)
      await expect(page.getByTestId("status-table")).toBeVisible();
    await bodyIsClean(page);
  }
});
