import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BANNED_WORDS, containsBannedWord, FOOTER, tierSentence } from "@stamper/core";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), redirect: () => {} }));

import { ChainPanel } from "../../components/ChainPanel";
import { FailureScreen } from "../../components/FailureScreen";
import { Header } from "../../components/Header";
import { RecordPanel } from "../../components/RecordPanel";
import { SourceLine } from "../../components/SourceLine";
import { StoragePanel } from "../../components/StoragePanel";
import { stampPresentationSchema } from "../../lib/api";
import { loadStamp } from "../../lib/chain";
import * as copy from "../../lib/copy";
import { FAILURES, type FailureKind } from "../../lib/copy";
import { type Fixture, makeFixture, presentation } from "../fixtures/stamp";
import { mockReader } from "./helpers";

/** Collects every string a copy table can produce (functions are called with sample arguments). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") out.push(String(v("5VEBTVRAF", "x")));
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === "object") for (const x of Object.values(v)) strings(x, out);
  return out;
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let f: Fixture;
beforeAll(async () => {
  f = await makeFixture();
});

describe("banned words", () => {
  it("core's list is the plan's list", () => {
    expect([...BANNED_WORDS]).toEqual([
      "verified",
      "authentic",
      "real",
      "same",
      "matches",
      "identical",
    ]);
  });

  it("no copy-table string contains a banned word", () => {
    const all = strings(
      Object.fromEntries(
        Object.entries(copy).filter(([k]) => k !== "verdictLabel" && k !== "tierSentence"),
      ),
    );
    expect(all.length).toBeGreaterThan(100);
    for (const s of all) expect(containsBannedWord(s), s).toBeNull();
  });

  it("no hard-coded user-facing literal in components or app routes contains a banned word", () => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    const files = [
      "components",
      "app",
      "app/v/[code]",
      "app/s/[code]",
      "app/scan",
      "app/status",
      "app/about",
    ].flatMap((d) =>
      readdirSync(root + d)
        .filter((n) => n.endsWith(".tsx"))
        .map((n) => `${root}${d}/${n}`),
    );
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const literals = [...src.matchAll(/>([^<>{}]+)</g), ...src.matchAll(/"([^"]{4,})"/g)].map(
        (m) => m[1] ?? "",
      );
      for (const l of literals) expect(containsBannedWord(l), `${file}: ${l}`).toBeNull();
    }
  });

  it("every designed failure screen renders without banned words", () => {
    const kinds = Object.keys(FAILURES) as FailureKind[];
    expect(kinds).toHaveLength(11);
    for (const k of kinds) {
      const html = renderToStaticMarkup(<FailureScreen kind={k} onAction={() => {}} />);
      expect(html).toContain(`failure-${k}`);
      expect(html).toContain(FAILURES[k].title);
      expect(containsBannedWord(text(html)), k).toBeNull();
    }
  });

  it("tier sentences and footer come from core and are clean", () => {
    expect(copy.FOOTER).toBe(FOOTER);
    for (const level of [0, 1, 2]) {
      for (const keyType of [0, 1, 2]) {
        const t = tierSentence({
          level,
          keyType,
          countersigned: level > 0,
          revokedBeforeStamp: false,
          registrarRemoved: true,
          offline: true,
          serverComputedCid: true,
        });
        expect(containsBannedWord(`${t.headline} ${t.means} ${t.doesNotMean}`)).toBeNull();
      }
    }
  });

  it("the full verify panels render clean with chain fixtures", async () => {
    const s = await loadStamp(f.stampId, mockReader(f));
    const p = stampPresentationSchema.parse(presentation(f, "http://x"));
    const tier = tierSentence({
      level: 1,
      keyType: 0,
      countersigned: true,
      revokedBeforeStamp: false,
      registrarRemoved: false,
      offline: false,
      serverComputedCid: false,
    });
    const html = renderToStaticMarkup(
      <>
        <Header label={copy.verdictLabel("ORIGINAL", f.code9)} tone="original" tier={tier} />
        <SourceLine s={{ state: "ok", source: "provider" }} />
        <RecordPanel s={s} code9={f.code9} chainId={31337} tier={tier} presentation={p} />
        <ChainPanel
          s={s}
          chainId={31337}
          registry="0x5FbDB2315678afecb367f032d93F642f64180aa3"
          device={{ ok: true, scheme: "secp256k1", claimRebuilt: true }}
          counter={{ ok: true, signer: f.registrar, method: "recovered" }}
          explorers={{}}
          presentation={p}
        />
        <StoragePanel s={s} presentation={p} servedBy="provider" explorers={{}} />
      </>,
    );
    const t = text(html);
    expect(t).toContain("ORIGINAL");
    expect(t).toContain(copy.VERIFY.hashAgrees);
    expect(t).toContain(copy.CHAIN.sigOk);
    expect(t.match(/last retrieval check: 2026-10-01 08:00:00 UTC/g)).toHaveLength(2);
    expect(t).toContain("final");
    // the only allowed exception is the byte-exact word ORIGINAL; nothing else may trip the list
    expect(containsBannedWord(t)).toBeNull();
  });
});
