"use client";
import { formatCode } from "@stamper/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { HOME } from "../lib/copy";
import { handOff } from "../lib/handoff";
import { compareTargets } from "../lib/use-copy-check";
import { viewFor } from "../lib/verdict";
import { useSharedCopyCheck } from "./CopyCheck";
import { DropZone } from "./DropZone";
import { FailureScreen } from "./FailureScreen";
import { VerdictBadge } from "./VerdictBadge";

/**
 * Landing-page "check a copy": the drop zone and, when the copy does not lead straight to one stamp
 * (lib/use-copy-check opens that stamp's page by itself), the result: not registered, or several
 * candidates to choose from.
 */
export function HomeCheck(props: { children?: ReactNode }) {
  const { busy, result, file, error, check } = useSharedCopyCheck();
  const view = result ? viewFor(result) : null;
  const targets = result ? compareTargets(result) : [];
  const foundBy =
    result?.via === "api" && (result.path === "perceptual" || result.path === "watermark")
      ? HOME.foundBy[result.path]
      : null;
  return (
    <>
      <DropZone onFile={(f) => void check(f)} busy={busy} />
      {error ? <p className="warn">{error}</p> : null}
      {result && view ? (
        <section className="panel" data-testid="home-result">
          <VerdictBadge tone={view.tone} label={view.label} />
          {view.screen ? (
            <FailureScreen kind={view.screen} inline>
              {foundBy ? <p className="muted small">{foundBy}</p> : null}
              {targets.length > 0 ? (
                <ul className="compare-targets">
                  {targets.map((t) => (
                    <li key={t.code9 ?? t.stampId}>
                      {t.code9 ? (
                        <code>{formatCode(t.code9)}</code>
                      ) : (
                        <code>{t.stampId?.slice(0, 18)}…</code>
                      )}
                      {t.distance !== undefined ? (
                        <span className="muted small">{HOME.distance(t.distance)}</span>
                      ) : null}
                      {t.code9 ? (
                        <Link
                          className="btn primary"
                          href={`/v/${t.code9}`}
                          onClick={() => file && handOff(t.code9 as string, file)}
                          data-testid="compare-link"
                        >
                          {HOME.compareCta}
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </FailureScreen>
          ) : null}
          {result.code9 && targets.length === 0 ? (
            <p>
              <Link href={`/v/${result.code9}`}>{formatCode(result.code9)}</Link>
            </p>
          ) : null}
        </section>
      ) : null}
      {props.children}
    </>
  );
}
