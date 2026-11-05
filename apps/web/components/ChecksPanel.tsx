import type { LoadedStamp } from "../lib/chain";
import { VERIFY } from "../lib/copy";
import type { RecordCheck } from "../lib/record";
import type { CountersigCheck, DeviceCheck } from "../lib/reverify";
import type { SourceState } from "./SourceLine";

type Row = { key: string; name: string; detail: string; state: "pass" | "fail" | "pending" };
const GLYPH = { pass: "✓", fail: "✕", pending: "…" } as const;

/** Every check behind the verdict, in the order the proof runs (design system: CheckList). */
export function ChecksPanel(props: {
  s: LoadedStamp;
  device: DeviceCheck;
  counter: CountersigCheck;
  source: SourceState;
  record: RecordCheck;
  finality: string;
}) {
  const { s, device, counter, source, record } = props;
  const C = VERIFY.checks;
  const rows: Row[] = [
    { key: "sig", name: C.signature, detail: device.scheme, state: device.ok ? "pass" : "fail" },
    {
      key: "claim",
      name: C.claim,
      detail: "digest = stamp id",
      state: device.claimRebuilt ? "pass" : "fail",
    },
  ];
  if (counter.method !== "none")
    rows.push({
      key: "counter",
      name: C.countersig,
      detail: `${counter.signer.slice(0, 6)}…${counter.signer.slice(-4)}`,
      state: counter.ok ? "pass" : "fail",
    });
  rows.push({
    key: "key",
    name: C.key,
    detail: s.key.revokedEpoch === 0n ? "revokedEpoch 0" : `epoch ${s.key.revokedEpoch}`,
    state: s.key.revokedEpoch === 0n ? "pass" : "fail",
  });
  if (record.state !== "absent")
    rows.push({
      key: "record",
      name: C.record,
      detail: "sha256 = recordHash",
      state: record.state === "ok" ? "pass" : "fail",
    });
  s.boundSlots.forEach((slot, i) => {
    const b = s.bindings[slot];
    const st = s.bindingStatuses[i];
    if (!b || !st) return;
    const live = st.dataSetLive && st.pieceLive && st.cidMatches && st.listenerIsFWSS;
    rows.push({
      key: `bind-${slot}`,
      name: C.binding(b.setId.toString()),
      detail: `piece ${b.pieceId} · FWSS`,
      state: live ? "pass" : "fail",
    });
    if (live)
      rows.push({
        key: `proof-${slot}`,
        name: C.proven(b.setId.toString()),
        detail: st.provingDeadline === 0n ? "—" : `deadline epoch ${st.provingDeadline}`,
        state: st.viewOk && st.provenThisPeriod ? "pass" : "pending",
      });
  });
  if (source.state !== "withheld")
    rows.push({
      key: "original",
      name: C.original,
      detail: "sha256 + PieceCID",
      state: source.state === "ok" ? "pass" : source.state === "bad" ? "fail" : "pending",
    });
  rows.push({
    key: "registered",
    name: C.registered,
    detail: `epoch ${s.stamp.registeredEpoch} · ${props.finality}`,
    state: "pass",
  });
  const held = rows.filter((r) => r.state === "pass").length;
  const pending = rows.filter((r) => r.state === "pending").length;
  return (
    <section className="panel" data-testid="checks-panel">
      <div className="checks-summary">
        <h2>{VERIFY.checksTitle}</h2>
        <span className="label" data-testid="checks-summary">
          {VERIFY.checksSummary(rows.length, held, pending)}
        </span>
      </div>
      <div className="checks">
        {rows.map((r) => (
          <div className={`check check-${r.state}`} key={r.key} data-state={r.state}>
            <span className="check-glyph" aria-hidden="true">
              {GLYPH[r.state]}
            </span>
            <span className="check-name">{r.name}</span>
            <span className="check-detail">{r.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
