import { finalityState } from "@stamper/core";
import type { Address } from "viem";
import type { StampPresentation } from "../lib/api";
import type { LoadedStamp } from "../lib/chain";
import type { Explorers, WebChainId } from "../lib/config";
import { CHAIN, VERIFY } from "../lib/copy";
import { epochToUtc, shortHex } from "../lib/format";
import type { CountersigCheck, DeviceCheck } from "../lib/reverify";

export function ChainPanel(props: {
  s: LoadedStamp;
  chainId: WebChainId;
  /** StampRegistry: what the explorer links open when the registration tx is unknown (no api) */
  registry: Address;
  device: DeviceCheck;
  counter: CountersigCheck;
  explorers: Explorers;
  presentation?: StampPresentation | null;
}) {
  const { s, device, counter } = props;
  const state = finalityState(s.head, s.finalized, s.stamp.registeredEpoch);
  const tx = props.presentation?.registerTx;
  const bs = props.explorers.blockscout ?? props.presentation?.explorers.blockscout;
  const ff = props.explorers.filfox ?? props.presentation?.explorers.filfox;
  const sigLine =
    device.scheme === "erc1271" ? CHAIN.sigContract : device.ok ? CHAIN.sigOk : CHAIN.sigFail;
  return (
    <section className="panel" data-testid="chain-panel">
      <h2>{CHAIN.title}</h2>
      {!s.rpcAgreement ? <p className="warn">{VERIFY.rpcDisagree}</p> : null}
      <p className={device.ok ? "ok" : "warn"} data-testid="sig-line">
        {sigLine} <span className="muted">({device.scheme})</span>
      </p>
      <p className="muted">{device.claimRebuilt ? CHAIN.claimRebuilt : CHAIN.claimNotRebuilt}</p>
      <dl>
        <div className="kv">
          <dt>{CHAIN.tx}</dt>
          <dd>
            {tx ? (
              bs ? (
                <a href={`${bs}/tx/${tx}`} rel="noreferrer" target="_blank">
                  <code>{shortHex(tx, 10)}</code>
                </a>
              ) : (
                <code>{tx}</code>
              )
            ) : (
              CHAIN.unknown
            )}
          </dd>
        </div>
        <div className="kv">
          <dt>{CHAIN.epoch}</dt>
          <dd>
            {s.stamp.registeredEpoch.toString()} ·{" "}
            {epochToUtc(props.chainId, s.stamp.registeredEpoch)}
          </dd>
        </div>
        <div className="kv">
          <dt>{CHAIN.state}</dt>
          <dd data-testid="finality">{CHAIN.states[state]}</dd>
        </div>
        <div className="kv">
          <dt>{CHAIN.countersigner}</dt>
          <dd>
            {counter.method === "none" ? (
              CHAIN.noCountersig
            ) : (
              <>
                <code className="wrap">{counter.signer}</code>
                <br />
                <span className={counter.ok ? "ok" : "warn"}>
                  {counter.method === "recovered"
                    ? CHAIN.countersigRecovered
                    : CHAIN.countersigChain}
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>
      {bs || ff ? (
        <p>
          {CHAIN.links}:{" "}
          {bs ? (
            <a
              href={tx ? `${bs}/tx/${tx}` : `${bs}/address/${props.registry}`}
              rel="noreferrer"
              target="_blank"
            >
              Blockscout
            </a>
          ) : null}
          {bs && ff ? " · " : null}
          {ff ? (
            <a
              href={tx ? `${ff}/en/message/${tx}` : `${ff}/en/address/${props.registry}`}
              rel="noreferrer"
              target="_blank"
            >
              Filfox
            </a>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
