import type { StampPresentation } from "../lib/api";
import type { LoadedStamp } from "../lib/chain";
import type { Explorers } from "../lib/config";
import { SOURCES, STORAGE } from "../lib/copy";
import type { SourceKind } from "../lib/fetch-original";
import { isoToUtc } from "../lib/format";

const yn = (b: boolean) => (b ? STORAGE.yes : STORAGE.no);

export function StoragePanel(props: {
  s: LoadedStamp;
  presentation?: StampPresentation | null;
  servedBy: SourceKind | null;
  explorers: Explorers;
}) {
  const { s } = props;
  return (
    <section className="panel" data-testid="storage-panel">
      <h2>{STORAGE.title}</h2>
      {s.boundSlots.map((slot, i) => {
        const b = s.bindings[slot];
        const st = s.bindingStatuses[i];
        if (!b || !st) return null;
        const dto = props.presentation?.bindings.find((x) => x.slot === slot);
        const okAt = isoToUtc(dto?.lastOkAt);
        const probeAt = isoToUtc(dto?.lastProbeAt);
        const first = okAt
          ? STORAGE.lastCheck(okAt)
          : probeAt
            ? STORAGE.lastCheckFailed(probeAt)
            : STORAGE.lastCheckUnknown;
        const live = st.dataSetLive && st.pieceLive && st.cidMatches && st.listenerIsFWSS;
        return (
          <article className="binding" key={slot} data-testid="binding">
            <p className="probe-line" data-testid="probe-line">
              {first}
            </p>
            <dl>
              <div className="kv">
                <dt>{STORAGE.provider}</dt>
                <dd>
                  <code className="wrap">{b.provider}</code> (#{st.providerId.toString()})
                </dd>
              </div>
              <div className="kv">
                <dt>{STORAGE.dataSet}</dt>
                <dd>{b.setId.toString()}</dd>
              </div>
              <div className="kv">
                <dt>{STORAGE.pieceId}</dt>
                <dd>{b.pieceId.toString()}</dd>
              </div>
              <div className="kv">
                <dt>{STORAGE.live}</dt>
                <dd>{yn(live)}</dd>
              </div>
              <div className="kv">
                <dt>{STORAGE.proven}</dt>
                <dd>{yn(st.viewOk && st.provenThisPeriod)}</dd>
              </div>
              <div className="kv">
                <dt>{STORAGE.deadline}</dt>
                <dd>{st.provingDeadline === 0n ? "—" : `epoch ${st.provingDeadline}`}</dd>
              </div>
              {dto ? (
                <div className="kv">
                  <dt>{STORAGE.faults}</dt>
                  <dd>{dto.probeFailures}</dd>
                </div>
              ) : null}
              <div className="kv">
                <dt>{STORAGE.payment}</dt>
                <dd>{yn(st.viewOk && st.pdpEndEpoch === 0n)}</dd>
              </div>
              <div className="kv">
                <dt />
                <dd className="muted">{b.trusted ? STORAGE.trusted : STORAGE.untrusted}</dd>
              </div>
            </dl>
            {props.explorers.pdp ? (
              <a
                href={`${props.explorers.pdp}/dataset/${b.setId}`}
                rel="noreferrer"
                target="_blank"
              >
                {STORAGE.explorer}
              </a>
            ) : null}
          </article>
        );
      })}
      {props.servedBy ? (
        <p className="muted" data-testid="served-by">
          {STORAGE.served}: {SOURCES[props.servedBy]}
        </p>
      ) : null}
    </section>
  );
}
