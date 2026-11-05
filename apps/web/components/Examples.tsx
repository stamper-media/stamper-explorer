"use client";
import { formatCode } from "@stamper/core";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import type { Example } from "../lib/config";
import { HOME } from "../lib/copy";
import { useSharedCopyCheck } from "./CopyCheck";

/**
 * "Try an example" under the hero copy. A plain example opens its stamp; one that carries a copy
 * (an edited version of the photo) is checked as if dropped, which opens the stamp with the
 * comparison already drawn.
 */
export function Examples({ examples }: { examples: Example[] }) {
  const { busy, checkPath } = useSharedCopyCheck();
  const [active, setActive] = useState<string | null>(null);
  if (examples.length === 0) return null;
  return (
    <div className="examples" data-testid="examples">
      <span className="label">{HOME.examplesTitle}</span>
      <div className="example-list">
        {examples.map((e) => {
          const key = `${e.code9}:${e.copy ?? ""}`;
          const loading = !!busy && active === key;
          const inner = (
            <>
              {e.thumb ? (
                <img className="example-thumb" src={e.thumb} alt="" width={52} height={52} />
              ) : (
                <span className="example-thumb" aria-hidden="true" />
              )}
              <span className="example-text">
                <span className="example-title">{e.title}</span>
                <span className="example-sub">
                  {e.copy
                    ? HOME.exampleCopySub
                    : e.demo
                      ? HOME.exampleDemoSub
                      : formatCode(e.code9)}
                </span>
              </span>
              <span className={`example-go${loading ? " loading" : ""}`} aria-hidden="true">
                {loading ? null : "→"}
              </span>
            </>
          );
          const copy = e.copy;
          return copy ? (
            <button
              key={key}
              type="button"
              className="example"
              disabled={!!busy}
              aria-busy={loading}
              onClick={() => {
                setActive(key);
                void checkPath(copy);
              }}
              data-testid="example-copy"
            >
              {inner}
            </button>
          ) : (
            <ExampleLink key={key} href={`/v/${e.code9}`}>
              {inner}
            </ExampleLink>
          );
        })}
      </div>
      {busy && active ? (
        <p className="example-status muted small" role="status">
          {busy}
        </p>
      ) : null}
    </div>
  );
}

function ExampleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="example" href={href}>
      {children}
    </Link>
  );
}
