/**
 * Chain reads for the verify page. Every read goes to each configured RPC (Glif ∥ Ankr in production)
 * and the answers are compared; Multicall3 is used through @stamper/contracts-abi on Filecoin chains.
 */
import {
  type BindingStatus,
  readBindingStatuses,
  readStampBundle,
  readStampByCode,
  type StampBundle,
  stampRegistryAbi,
  stampResolverAbi,
} from "@stamper/contracts-abi";
import { normaliseCode, type VerifyIO } from "@stamper/core";
import {
  type Address,
  type Chain,
  createPublicClient,
  type Hex,
  http,
  type PublicClient,
  zeroHash,
} from "viem";
import { anvil, filecoin, filecoinCalibration } from "viem/chains";
import { getConfig, type WebChainId, type WebConfig } from "./config";
import { toJson } from "./format";

export type { BindingStatus, StampBundle };

export type ChainReader = {
  chainId: WebChainId;
  registry: Address;
  resolver: Address | null;
  clients: PublicClient[];
};

export class InvalidCodeError extends Error {
  constructor(readonly reason: "non-ascii" | "length" | "symbol" | "check") {
    super(`invalid code: ${reason}`);
    this.name = "InvalidCodeError";
  }
}

export class NoRpcError extends Error {
  constructor() {
    super("no RPC configured");
    this.name = "NoRpcError";
  }
}

const CHAINS: Record<WebChainId, Chain> = {
  314: filecoin,
  314159: filecoinCalibration,
  31337: anvil,
};

export function makeReader(cfg: WebConfig): ChainReader {
  if (cfg.rpcUrls.length === 0) throw new NoRpcError();
  const chain = CHAINS[cfg.chainId];
  return {
    chainId: cfg.chainId,
    registry: cfg.registry,
    resolver: cfg.resolver,
    clients: cfg.rpcUrls.map(
      (url) =>
        createPublicClient({
          chain,
          transport: http(url, { retryCount: 1, timeout: 15_000 }),
          batch: { multicall: false },
        }) as PublicClient,
    ),
  };
}

let defaultReader: ChainReader | null = null;
function reader(r?: ChainReader): ChainReader {
  if (r) return r;
  defaultReader ??= makeReader(getConfig());
  return defaultReader;
}

export type Agreed<T> = { value: T; agreement: boolean; answered: number };

/**
 * Runs `fn` against every client. All answers equal → agreement. A failing endpoint is tolerated
 * (agreement false); all failing rethrows the first error.
 */
export async function agree<T>(
  clients: PublicClient[],
  fn: (c: PublicClient) => Promise<T>,
): Promise<Agreed<T>> {
  const settled = await Promise.allSettled(clients.map(fn));
  const ok = settled.filter(
    (s): s is PromiseFulfilledResult<Awaited<T>> => s.status === "fulfilled",
  );
  const first = ok[0];
  if (!first) throw (settled[0] as PromiseRejectedResult).reason;
  const key = toJson(first.value, 0);
  const allSame = ok.every((s) => toJson(s.value, 0) === key);
  return {
    value: first.value,
    agreement: allSame && ok.length === clients.length,
    answered: ok.length,
  };
}

export async function lookupByCode(
  code9: string,
  r?: ChainReader,
): Promise<
  { stampId: Hex; rpcAgreement: boolean } | { notRegistered: true; rpcAgreement: boolean }
> {
  const n = normaliseCode(code9);
  if (!n.ok) throw new InvalidCodeError(n.reason);
  const rd = reader(r);
  const { value, agreement } = await agree(rd.clients, (c) =>
    readStampByCode(c, rd.registry, n.value),
  );
  if (value === zeroHash) return { notRegistered: true, rpcAgreement: agreement };
  return { stampId: value, rpcAgreement: agreement };
}

export type LoadedStamp = StampBundle & {
  stampId: Hex;
  bindingStatuses: BindingStatus[];
  /** slot index for each entry of bindingStatuses */
  boundSlots: number[];
  head: bigint;
  finalized: bigint | null;
  resolverFlag: number;
  rpcAgreement: boolean;
};

async function finalizedBlock(c: PublicClient): Promise<bigint | null> {
  try {
    const b = await c.getBlock({ blockTag: "finalized" });
    return b.number ?? null;
  } catch {
    return null;
  }
}

export async function loadStamp(stampId: Hex, r?: ChainReader): Promise<LoadedStamp> {
  const rd = reader(r);
  const bundle = await agree(rd.clients, (c) => readStampBundle(c, rd.registry, stampId));
  const boundSlots = bundle.value.bindings.flatMap((b, i) => (b.boundEpoch !== 0n ? [i] : []));
  const [statuses, head, finalized, flag] = await Promise.all([
    boundSlots.length
      ? agree(rd.clients, (c) => readBindingStatuses(c, rd.registry, stampId, boundSlots))
      : Promise.resolve({ value: [] as BindingStatus[], agreement: true, answered: 0 }),
    Promise.any(rd.clients.map((c) => c.getBlockNumber())),
    Promise.any(rd.clients.map(finalizedBlock)),
    rd.resolver
      ? agree(rd.clients, (c) =>
          c.readContract({
            address: rd.resolver as Address,
            abi: stampResolverAbi,
            functionName: "flag",
            args: [stampId],
          }),
        ).catch(() => ({ value: 0, agreement: false, answered: 0 }))
      : Promise.resolve({ value: 0, agreement: true, answered: 0 }),
  ]);
  return {
    ...bundle.value,
    stampId,
    bindingStatuses: statuses.value,
    boundSlots,
    head,
    finalized,
    resolverFlag: Number(flag.value),
    rpcAgreement: bundle.agreement && statuses.agreement && flag.agreement,
  };
}

/** Chain IO for core.decide(): exact and derivative paths need nothing but eth_call. */
export function chainVerifyIO(r?: ChainReader, typedCode?: string): VerifyIO {
  const rd = reader(r);
  const call = async (functionName: "firstStampOf" | "stampByDerivativeHash", h: Hex) =>
    (
      await agree(rd.clients, (c) =>
        c.readContract({ address: rd.registry, abi: stampRegistryAbi, functionName, args: [h] }),
      )
    ).value;
  return {
    firstStampOf: (h) => call("firstStampOf", h),
    stampByDerivativeHash: (h) => call("stampByDerivativeHash", h),
    stampByCode: async (code) =>
      (await agree(rd.clients, (c) => readStampByCode(c, rd.registry, code))).value,
    getStamp: async (id) => {
      const s = (
        await agree(rd.clients, (c) =>
          c.readContract({
            address: rd.registry,
            abi: stampRegistryAbi,
            functionName: "getStamp",
            args: [id],
          }),
        )
      ).value;
      if (s.registeredEpoch === 0n) return null;
      return { contentHash: s.contentHash, pieceCid: s.pieceCid, code: BigInt(s.code) };
    },
    ...(typedCode ? { typedCode } : {}),
  };
}
