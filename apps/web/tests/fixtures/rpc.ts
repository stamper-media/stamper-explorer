/** JSON-RPC answering eth_call from the fixture with real ABI encoding (no node needed). */
import { stampRegistryAbi, stampResolverAbi } from "@stamper/contracts-abi";
import { decodeFunctionData, encodeFunctionResult, type Hex, toHex, zeroHash } from "viem";
import type { Fixture } from "./stamp";

const abi = [...stampRegistryAbi, ...stampResolverAbi];
type Req = { id?: number | string; jsonrpc?: string; method: string; params?: unknown[] };
const eq = (a: unknown, b: unknown) => String(a).toLowerCase() === String(b).toLowerCase();

export function rpcHandler(f: Fixture, opts: { tamperCode?: boolean } = {}) {
  const emptyStamp = {
    ...f.stamp,
    registeredEpoch: 0n,
    code: 0,
    contentHash: zeroHash,
    pieceCid: "0x" as Hex,
    sig: "0x" as Hex,
  };
  function call(data: Hex): Hex {
    const { functionName, args } = decodeFunctionData({ abi, data });
    const a = (args ?? []) as readonly unknown[];
    const r = (result: unknown) =>
      encodeFunctionResult({ abi, functionName, result } as Parameters<
        typeof encodeFunctionResult
      >[0]);
    switch (functionName) {
      case "stampByCode":
        return r(!opts.tamperCode && BigInt(a[0] as number) === f.code ? f.stampId : zeroHash);
      case "firstStampOf":
        return r(eq(a[0], f.stamp.contentHash) ? f.stampId : zeroHash);
      case "stampByDerivativeHash":
        return r(zeroHash);
      case "getStamp":
        return r(eq(a[0], f.stampId) ? f.stamp : emptyStamp);
      case "getKey":
        return r(f.key);
      case "getBindings":
        return r(f.bindings);
      case "getDerivatives":
        return r([]);
      case "effectiveLevel":
        return r(f.effectiveLevel);
      case "registrarActiveFrom":
        return r(f.registrarActiveFrom);
      case "bindingStatus":
        return r(f.bindingStatuses[Number(a[1])]);
      case "flag":
        return r(f.resolverFlag);
      default:
        throw new Error(`unsupported call ${functionName}`);
    }
  }
  function one(req: Req): unknown {
    const base = { jsonrpc: "2.0", id: req.id ?? null };
    try {
      switch (req.method) {
        case "eth_chainId":
          return { ...base, result: toHex(31337) };
        case "eth_blockNumber":
          return { ...base, result: toHex(f.head) };
        case "eth_getBlockByNumber": {
          const n = req.params?.[0] === "finalized" ? f.finalized : f.head;
          return {
            ...base,
            result: {
              number: toHex(n),
              hash: `0x${"11".repeat(32)}`,
              timestamp: toHex(1_790_000_000n + n * 30n),
              transactions: [],
            },
          };
        }
        case "eth_call": {
          const p = req.params?.[0] as { data?: Hex; input?: Hex };
          return { ...base, result: call((p.data ?? p.input) as Hex) };
        }
        default:
          return { ...base, error: { code: -32601, message: `method ${req.method} not found` } };
      }
    } catch (e) {
      return {
        ...base,
        error: { code: 3, message: e instanceof Error ? e.message : String(e), data: "0x" },
      };
    }
  }
  return (body: unknown): unknown =>
    Array.isArray(body) ? body.map((b) => one(b as Req)) : one(body as Req);
}
