"use client";
import type { StampPresentation } from "../lib/api";
import type { LoadedStamp } from "../lib/chain";
import { EVIDENCE } from "../lib/copy";
import { toJson } from "../lib/format";
import type { CountersigCheck, DeviceCheck } from "../lib/reverify";

/** DESIGN §8.2 item 6: the chain-derived part of the bundle is built here; the api adds probe logs. */
export function buildEvidence(input: {
  s: LoadedStamp;
  code9: string;
  chainId: number;
  registry: string;
  device: DeviceCheck;
  counter: CountersigCheck;
  presentation?: StampPresentation | null;
}) {
  const { s } = input;
  return {
    kind: "stamper-evidence",
    version: 1,
    generatedAt: new Date().toISOString(),
    chainId: input.chainId,
    registry: input.registry,
    code: input.code9,
    stampId: s.stampId,
    stamp: s.stamp,
    key: s.key,
    bindings: s.bindings.filter((b) => b.boundEpoch !== 0n),
    bindingStatuses: s.bindingStatuses,
    derivatives: s.derivatives,
    effectiveLevel: s.effectiveLevel,
    head: s.head,
    finalized: s.finalized,
    rpcAgreement: s.rpcAgreement,
    browserChecks: { device: input.device, countersignature: input.counter },
    registerTx: input.presentation?.registerTx ?? null,
  };
}

export function EvidenceButton(
  props: Parameters<typeof buildEvidence>[0] & { apiUrl: string | null },
) {
  function download() {
    const blob = new Blob([toJson(buildEvidence(props))], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stamper-${props.code9}-evidence.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5_000);
  }
  return (
    <section className="panel" data-testid="evidence-panel">
      <h2>{EVIDENCE.title}</h2>
      <button type="button" className="btn" onClick={download}>
        {EVIDENCE.download}
      </button>
      {props.apiUrl ? (
        <p>
          <a href={props.apiUrl} rel="noreferrer" target="_blank">
            {EVIDENCE.fromApi}
          </a>
        </p>
      ) : null}
    </section>
  );
}
