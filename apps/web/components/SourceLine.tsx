import { SOURCES, VERIFY } from "../lib/copy";
import type { FetchProgress, SourceKind } from "../lib/fetch-original";
import { formatBytes } from "../lib/format";

export type SourceState =
  | { state: "fetching"; progress?: FetchProgress }
  | { state: "ok"; source: SourceKind }
  | { state: "bad"; source: SourceKind }
  | { state: "unavailable" }
  | { state: "withheld" };

export function SourceLine({ s }: { s: SourceState }) {
  let text: string;
  if (s.state === "fetching") {
    const p = s.progress;
    text = p
      ? `${VERIFY.hashChecking} ${formatBytes(p.loaded).split(" (")[0]}${p.total ? ` / ${formatBytes(p.total).split(" (")[0]}` : ""} — ${SOURCES[p.source]}`
      : VERIFY.hashChecking;
  } else if (s.state === "ok") text = `${VERIFY.hashAgrees} — ${SOURCES[s.source]}`;
  else if (s.state === "bad") text = `${VERIFY.hashDisagrees} — ${SOURCES[s.source]}`;
  else if (s.state === "withheld") text = "";
  else text = VERIFY.hashOnlyLine;
  return (
    <p className={`source-line source-${s.state}`} data-testid="source-line" aria-live="polite">
      {text}
    </p>
  );
}
