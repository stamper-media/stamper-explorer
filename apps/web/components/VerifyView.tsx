"use client";
/**
 * /v/<code>: every verdict input comes from eth_call (two RPCs compared) and this browser's own re-hash.
 * The api supplies presentation only; when it is unreachable the panels degrade and the verdict stands.
 */
import { type Decision, decide, finalityState, formatCode, tierSentence } from "@stamper/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClient, type StampPresentation } from "../lib/api";
import {
  type ChainReader,
  chainVerifyIO,
  type LoadedStamp,
  loadStamp,
  lookupByCode,
  makeReader,
} from "../lib/chain";
import { compareImages, diffToObjectUrl } from "../lib/compare";
import { getConfig } from "../lib/config";
import { CHAIN, ERRORS, LEVEL_NAMES, VERIFY, WITHDRAWN_REASON } from "../lib/copy";
import { buildSources, fetchOriginal, OriginalUnavailableError } from "../lib/fetch-original";
import { epochToUtc, msToUtc } from "../lib/format";
import { takeHandoff } from "../lib/handoff";
import { checkRecord } from "../lib/record";
import {
  type CountersigCheck,
  type DeviceCheck,
  reverifyCountersignature,
  reverifyDeviceSignature,
} from "../lib/reverify";
import { checkCopy, noticesFor, tierInputFrom, viewFor, WITHDRAWN_FLAGS } from "../lib/verdict";
import { createWorkerHasher, hashBlob } from "../lib/worker-hasher";
import { ChainPanel } from "./ChainPanel";
import { ChecksPanel } from "./ChecksPanel";
import { CompareSlider } from "./CompareSlider";
import { CopyButton } from "./CopyButton";
import { DiffOverlay } from "./DiffOverlay";
import { DropZone } from "./DropZone";
import { EvidenceButton } from "./EvidenceButton";
import { FailureScreen } from "./FailureScreen";
import { Header } from "./Header";
import { LocationPanel, shortLocation } from "./LocationPanel";
import { RecordPanel, safePieceCidText } from "./RecordPanel";
import { SourceLine, type SourceState } from "./SourceLine";
import { StoragePanel } from "./StoragePanel";

type Phase =
  | { kind: "loading" }
  | { kind: "screen"; screen: "not-registered" | "registering" | "rejected" }
  | { kind: "error"; message: string }
  | { kind: "ready"; s: LoadedStamp; device: DeviceCheck; counter: CountersigCheck };

type Original = { url: string; blob: Blob; decision: Decision | null };
type CopyState = {
  url: string;
  isImage: boolean;
  decision: Decision | null;
  diff?: { url: string; ratio: number; ssim: number };
  busy: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function VerifyView({ code9 }: { code9: string }) {
  const cfg = getConfig();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [pres, setPres] = useState<StampPresentation | null>(null);
  // null: fine; "down": the api did not answer; "unknown": it answered 404 (registered elsewhere)
  const [presFailed, setPresFailed] = useState<null | "down" | "unknown">(null);
  const [source, setSource] = useState<SourceState>({ state: "fetching" });
  const [original, setOriginal] = useState<Original | null>(null);
  const [copy, setCopy] = useState<CopyState | null>(null);
  const [nonce, setNonce] = useState(0);
  const readerRef = useRef<ChainReader | null>(null);
  const api = useRef(new ApiClient(cfg.apiUrl)).current;

  useEffect(() => {
    let dead = false;
    const ctl = new AbortController();
    void nonce;
    (async () => {
      setPhase({ kind: "loading" });
      setSource({ state: "fetching" });
      let reader: ChainReader;
      try {
        reader = makeReader(cfg);
      } catch {
        setPhase({ kind: "error", message: ERRORS.noRpc });
        return;
      }
      readerRef.current = reader;
      const presP = api.presentation(code9, ctl.signal).then((r) => {
        if (dead) return null;
        if (r.ok) setPres(r.data);
        else setPresFailed(r.status === 404 ? "unknown" : "down");
        return r.ok ? r.data : null;
      });
      const found = await lookupByCode(code9, reader);
      if (dead) return;
      if ("notRegistered" in found) {
        const p = await presP;
        if (dead) return;
        const screen =
          p?.status === "received" || p?.status === "registering"
            ? "registering"
            : p?.status === "rejected"
              ? "rejected"
              : "not-registered";
        setPhase({ kind: "screen", screen });
        return;
      }
      const s = await loadStamp(found.stampId, reader);
      if (dead) return;
      s.rpcAgreement &&= found.rpcAgreement;
      const device = reverifyDeviceSignature(s, s.stampId, cfg.chainId, cfg.registry);
      const counter = reverifyCountersignature(s, cfg.chainId, cfg.registry, s.stampId);
      setPhase({ kind: "ready", s, device, counter });

      if (WITHDRAWN_FLAGS.has(s.resolverFlag)) {
        setSource({ state: "withheld" });
        return;
      }
      // Give the presentation api a brief chance to add provider URLs; never wait on it for long.
      const hints = await Promise.race([presP, sleep(1500).then(() => null)]);
      if (dead) return;
      const sources = buildSources(cfg, safePieceCidText(s.stamp.pieceCid), hints?.originalSources);
      try {
        const r = await fetchOriginal(
          sources,
          { sha256: s.stamp.contentHash, pieceCid: s.stamp.pieceCid },
          (p) => !dead && setSource({ state: "fetching", progress: p }),
          { makeHasher: createWorkerHasher, signal: ctl.signal, mime: hints?.mime },
        );
        if (dead) return;
        if (!(r.sha256Ok && r.pieceCidOk)) {
          setSource({ state: "bad", source: r.source });
          return;
        }
        // Exact path of the ladder, from chain state only.
        const decision = await decide(
          { sha256: r.sha256, pieceCid: r.pieceCid },
          chainVerifyIO(reader),
        );
        if (dead) return;
        setOriginal({ url: URL.createObjectURL(r.blob), blob: r.blob, decision });
        setSource({ state: "ok", source: r.source });
      } catch (e) {
        if (dead) return;
        // OriginalUnavailableError or a stream failure: offer the hash-only comparison.
        if (e instanceof OriginalUnavailableError || e instanceof Error)
          setSource({ state: "unavailable" });
      }
    })().catch((e: unknown) => {
      if (!dead) setPhase({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      dead = true;
      ctl.abort();
    };
  }, [code9, nonce, api, cfg]);

  // Recover the countersignature in-browser once the api supplies its bytes.
  useEffect(() => {
    if (phase.kind !== "ready" || !pres?.countersig || phase.counter.method === "recovered") return;
    const counter = reverifyCountersignature(
      phase.s,
      cfg.chainId,
      cfg.registry,
      phase.s.stampId,
      pres.countersig as `0x${string}`,
    );
    setPhase({ ...phase, counter });
  }, [pres, phase, cfg]);

  const onCopy = useCallback(
    async (file: File) => {
      const reader = readerRef.current;
      if (!reader) return;
      const url = URL.createObjectURL(file);
      const isImage = file.type.startsWith("image/");
      setCopy({ url, isImage, decision: null, busy: VERIFY.hashChecking });
      try {
        const d = await hashBlob(file);
        const decision = await checkCopy(d, chainVerifyIO(reader, code9), { api, file });
        let diff: CopyState["diff"];
        if (decision.verdict === "RELATED_COMPARE" && isImage && original) {
          try {
            const r = await compareImages(original.blob, file);
            diff = { url: await diffToObjectUrl(r), ratio: r.ratio, ssim: r.ssim };
          } catch {
            diff = undefined;
          }
        }
        setCopy({ url, isImage, decision, diff, busy: null });
      } catch (e) {
        setCopy({ url, isImage, decision: null, busy: e instanceof Error ? e.message : String(e) });
      }
    },
    [api, code9, original],
  );

  // A copy handed over by the home page search is compared once the original is in (or known missing).
  const settled = original !== null || source.state === "unavailable";
  useEffect(() => {
    if (!settled) return;
    const f = takeHandoff(code9);
    if (f) void onCopy(f);
  }, [settled, code9, onCopy]);

  if (phase.kind === "loading") {
    return <Header label={VERIFY.loadingChain} tone="pending" tier={null} />;
  }
  if (phase.kind === "error") {
    return (
      <section className="failure" role="alert" data-testid="failure-error">
        <h2>{ERRORS.generic}</h2>
        <p className="muted">{phase.message}</p>
        <button type="button" className="btn" onClick={() => setNonce((n) => n + 1)}>
          {ERRORS.retry}
        </button>
      </section>
    );
  }
  if (phase.kind === "screen") {
    return (
      <FailureScreen
        kind={phase.screen}
        detail={<code>{formatCode(code9)}</code>}
        onAction={phase.screen === "registering" ? () => setNonce((n) => n + 1) : undefined}
      />
    );
  }

  const { s, device, counter } = phase;
  const tier = tierSentence(tierInputFrom(s));
  const notices = noticesFor(s);
  const active = copy?.decision ?? original?.decision ?? null;
  const view = active ? viewFor({ ...active, code9: active.code9 ?? code9 }) : null;
  const label = view?.label ?? `${VERIFY.registered} — ${formatCode(code9)}`;
  const isVideo = s.stamp.mediaKind === 2;
  const withheld = source.state === "withheld";
  const record = checkRecord(pres?.record, s.stamp.recordHash);
  const cell = record.state === "ok" ? record.record.location : undefined;
  const finality = CHAIN.states[finalityState(s.head, s.finalized, s.stamp.registeredEpoch)];
  const demo = cfg.examples.find((e) => e.code9 === code9)?.demo ?? false;
  const code = formatCode(code9);

  return (
    <div className="verify">
      <div className="verify-left">
        <section className="panel verdict-card compare-panel" data-testid="compare-panel">
          <Header
            label={label}
            tone={view?.tone ?? "pending"}
            tier={tier}
            sub={view ? undefined : withheld ? undefined : VERIFY.fetchingLine}
          />
          {demo ? <span className="demo-tag">{VERIFY.demo}</span> : null}
          <div className="stamp-code">
            <span className="label">{VERIFY.stampCode}</span>
            <span className="stamp-code-value">
              <span>
                {code.slice(0, -1)}
                <span className="check-symbol">{code.slice(-1)}</span>
              </span>
              <CopyButton value={code} />
            </span>
          </div>
          <SourceLine s={source} />
          {source.state === "unavailable" ? (
            <FailureScreen
              kind="original-unavailable"
              inline
              onAction={() => setNonce((n) => n + 1)}
            />
          ) : null}
          {copy?.decision && view?.screen && copy.decision.verdict !== "ORIGINAL" ? (
            <FailureScreen kind={view.screen} inline>
              {copy.diff ? (
                <DiffOverlay
                  diffUrl={copy.diff.url}
                  ratio={copy.diff.ratio}
                  ssim={copy.diff.ssim}
                />
              ) : null}
            </FailureScreen>
          ) : null}
          {original && copy?.isImage && !isVideo ? (
            <CompareSlider original={original.url} copy={copy.url} />
          ) : original && !isVideo ? (
            <div className="frame">
              <img
                className="original"
                src={original.url}
                alt="Stored original"
                data-testid="original-image"
              />
            </div>
          ) : !isVideo && !withheld ? (
            <div className="frame">
              <span className="frame-empty">
                {source.state === "fetching" ? VERIFY.frameLoading : VERIFY.frameUnavailable}
              </span>
            </div>
          ) : null}
          {isVideo && original ? (
            <div className="side-by-side">
              <video src={original.url} controls playsInline muted />
              {copy ? <video src={copy.url} controls playsInline muted /> : null}
              <p className="muted">{VERIFY.video}</p>
            </div>
          ) : null}
          <dl className="facts">
            <div>
              <dt>{VERIFY.facts.captured}</dt>
              <dd>{msToUtc(s.stamp.capturedAt)}</dd>
            </div>
            <div>
              <dt>{VERIFY.facts.registered}</dt>
              <dd>{epochToUtc(cfg.chainId, s.stamp.registeredEpoch)}</dd>
            </div>
            <div>
              <dt>{VERIFY.facts.device}</dt>
              <dd>{LEVEL_NAMES[s.effectiveLevel] ?? `L${s.effectiveLevel}`}</dd>
            </div>
            <div>
              <dt>{VERIFY.facts.location}</dt>
              <dd>{cell ? shortLocation(cell) : VERIFY.locationNone}</dd>
            </div>
          </dl>
          {!withheld ? (
            <DropZone
              title={VERIFY.dropYourCopy}
              hint={original ? undefined : VERIFY.hashOnlyLine}
              busy={copy?.busy ?? null}
              onFile={(f) => void onCopy(f)}
            />
          ) : null}
        </section>
        {presFailed && cfg.apiUrl ? (
          <p className="muted small">
            {presFailed === "unknown" ? VERIFY.presentationUnknown : VERIFY.presentationUnavailable}
          </p>
        ) : null}
        {notices.map((k) => (
          <FailureScreen
            key={k}
            kind={k}
            inline
            detail={
              k === "withdrawn" || k === "rejected"
                ? (WITHDRAWN_REASON[s.resolverFlag] ?? null)
                : null
            }
          />
        ))}
      </div>

      <div className="verify-right">
        <ChecksPanel
          s={s}
          device={device}
          counter={counter}
          source={source}
          record={record}
          finality={finality}
        />
        {cell && record.state === "ok" ? (
          <LocationPanel cell={cell} privateHash={record.record.privateHash} />
        ) : null}
        <RecordPanel s={s} code9={code9} chainId={cfg.chainId} tier={tier} presentation={pres} />
        <ChainPanel
          s={s}
          chainId={cfg.chainId}
          registry={cfg.registry}
          device={device}
          counter={counter}
          explorers={cfg.explorers}
          presentation={pres}
        />
        <StoragePanel
          s={s}
          presentation={pres}
          servedBy={source.state === "ok" ? source.source : null}
          explorers={cfg.explorers}
        />
        <EvidenceButton
          s={s}
          code9={code9}
          chainId={cfg.chainId}
          registry={cfg.registry}
          device={device}
          counter={counter}
          presentation={pres}
          apiUrl={api.stampPath(code9, "evidence.json")}
        />
      </div>
    </div>
  );
}
