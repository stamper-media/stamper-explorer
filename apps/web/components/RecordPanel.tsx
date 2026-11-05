import { formatCode, parsePieceCid, pieceCidString, type TierSentence } from "@stamper/core";
import { zeroAddress } from "viem";
import type { StampPresentation } from "../lib/api";
import type { LoadedStamp } from "../lib/chain";
import type { WebChainId } from "../lib/config";
import { LEVEL_NAMES, RECORD } from "../lib/copy";
import { epochToUtc, formatBytes, isoToUtc, msToUtc } from "../lib/format";
import { CopyButton } from "./CopyButton";

export function safePieceCidText(hex: `0x${string}`): string {
  try {
    return pieceCidString(parsePieceCid(hex));
  } catch {
    return hex;
  }
}

function Row({ k, v, copy }: { k: string; v: string; copy?: boolean }) {
  return (
    <div className="kv">
      <dt>{k}</dt>
      <dd>
        <code className="wrap">{v}</code>
        {copy ? <CopyButton value={v} /> : null}
      </dd>
    </div>
  );
}

export function RecordPanel(props: {
  s: LoadedStamp;
  code9: string;
  chainId: WebChainId;
  tier: TierSentence;
  presentation?: StampPresentation | null;
}) {
  const { s, presentation: p } = props;
  const received = isoToUtc(p?.receivedAt);
  return (
    <section className="panel" data-testid="record-panel">
      <h2>{RECORD.title}</h2>
      <dl>
        <Row k={RECORD.code} v={formatCode(props.code9)} copy />
        <Row k={RECORD.stampId} v={s.stampId} copy />
        <Row k={RECORD.sha256} v={s.stamp.contentHash} copy />
        <Row k={RECORD.pieceCid} v={safePieceCidText(s.stamp.pieceCid)} copy />
        <Row k={RECORD.size} v={formatBytes(s.stamp.contentLength)} />
        <Row k={RECORD.capturedAt} v={msToUtc(s.stamp.capturedAt)} />
        {received ? <Row k={RECORD.receivedAt} v={received} /> : null}
        <Row k={RECORD.registeredAt} v={epochToUtc(props.chainId, s.stamp.registeredEpoch)} />
        <Row k={RECORD.level} v={LEVEL_NAMES[s.effectiveLevel] ?? `L${s.effectiveLevel}`} />
        <Row k={RECORD.keyId} v={s.stamp.keyId} copy />
        {s.key.registrar !== zeroAddress ? <Row k={RECORD.registrar} v={s.key.registrar} /> : null}
        <Row
          k={RECORD.revocation}
          v={
            s.key.revokedEpoch === 0n
              ? RECORD.notRevoked
              : epochToUtc(props.chainId, s.key.revokedEpoch)
          }
        />
      </dl>
      <div className="means">
        <h3>{RECORD.means}</h3>
        <p>{props.tier.means}</p>
        <h3>{RECORD.doesNotMean}</h3>
        <p>{props.tier.doesNotMean}</p>
      </div>
    </section>
  );
}
