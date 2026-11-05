"use client";
import { useEffect, useState } from "react";
import { ApiClient, type DataSetHealth, type StorageHealth } from "../lib/api";
import { getConfig } from "../lib/config";
import { STATUS, STORAGE } from "../lib/copy";
import { epochToUtc, isoToUtc } from "../lib/format";

const isFailure = (v: unknown): v is { error: string } =>
  !!v && typeof v === "object" && "error" in v;

/** wei → FIL with three decimals (display only). */
function fil(wei: string): string {
  const v = BigInt(wei);
  const whole = v / 10n ** 18n;
  const milli = (v % 10n ** 18n) / 10n ** 15n;
  return `${whole}.${milli.toString().padStart(3, "0")} tFIL`;
}

export function StatusView() {
  const [h, setH] = useState<StorageHealth | null | "error">(null);
  useEffect(() => {
    const ctl = new AbortController();
    void new ApiClient(getConfig().apiUrl)
      .storageHealth(ctl.signal)
      .then((r) => setH(r.ok ? r.data : "error"));
    return () => ctl.abort();
  }, []);
  if (h === null) return <p className="muted">{STATUS.loading}</p>;
  if (h === "error") {
    return (
      <p className="warn" role="status" data-testid="status-unavailable">
        {STATUS.unavailable}
      </p>
    );
  }
  const cfg = getConfig();
  const when = (epoch: string | null | undefined) =>
    epoch && epoch !== "0" ? epochToUtc(cfg.chainId, BigInt(epoch)) : "—";
  const yesNo = (v: boolean | null | undefined) =>
    v === undefined || v === null ? "—" : v ? STORAGE.yes : STORAGE.no;
  const rows = Object.entries(h.dataSets).sort(([a], [b]) => a.localeCompare(b));
  const runway = h.runway && !isFailure(h.runway) ? h.runway : null;
  const session = h.sessionKey && !isFailure(h.sessionKey) ? h.sessionKey : null;
  const balance =
    h.relayer?.balanceWei && !isFailure(h.relayer.balanceWei) ? h.relayer.balanceWei : null;
  return (
    <div data-testid="status-table">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{STATUS.dataSet}</th>
              <th>{STATUS.provider}</th>
              <th>{STATUS.live}</th>
              <th>{STATUS.lastProven}</th>
              <th>{STATUS.nextDeadline}</th>
              <th>{STATUS.provenThisPeriod}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([slot, d]) =>
              isFailure(d) ? (
                <tr key={slot}>
                  <td>{slot}</td>
                  <td colSpan={5} className="muted">
                    {STATUS.unreadable}
                  </td>
                </tr>
              ) : (
                <DataSetRow
                  key={slot}
                  d={d}
                  pdp={cfg.explorers.pdp ?? null}
                  when={when}
                  yesNo={yesNo}
                />
              ),
            )}
          </tbody>
        </table>
      </div>
      <dl>
        {runway?.days !== undefined && runway.days !== null ? (
          <div className="kv">
            <dt>{STATUS.runway}</dt>
            <dd>
              {STATUS.days(runway.days)}
              {runway.fundedUntilEpoch
                ? ` · ${STATUS.fundedUntil(when(runway.fundedUntilEpoch))}`
                : ""}
            </dd>
          </div>
        ) : null}
        {balance ? (
          <div className="kv">
            <dt>{STATUS.relayer}</dt>
            <dd>{fil(balance)}</dd>
          </div>
        ) : null}
        {session?.expiresAt ? (
          <div className="kv">
            <dt>{STATUS.sessionKey}</dt>
            <dd>{isoToUtc(session.expiresAt)}</dd>
          </div>
        ) : null}
        {h.checkedAt ? (
          <div className="kv">
            <dt>{STATUS.checkedAt}</dt>
            <dd>{isoToUtc(h.checkedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function DataSetRow(props: {
  d: DataSetHealth;
  pdp: string | null;
  when: (epoch: string | null | undefined) => string;
  yesNo: (v: boolean | null | undefined) => string;
}) {
  const { d, pdp, when, yesNo } = props;
  return (
    <tr>
      <td>
        {pdp ? (
          <a href={`${pdp}/dataset/${d.dataSetId}`} rel="noreferrer">
            {d.dataSetId}
          </a>
        ) : (
          d.dataSetId
        )}
      </td>
      <td>{d.providerId ?? "—"}</td>
      <td>{yesNo(d.live)}</td>
      <td>{when(d.lastProvenEpoch)}</td>
      <td>{when(d.provingDeadline)}</td>
      <td>{yesNo(d.provenThisPeriod)}</td>
    </tr>
  );
}
