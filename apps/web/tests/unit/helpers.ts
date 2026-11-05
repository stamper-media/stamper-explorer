import { createPublicClient, custom, type PublicClient } from "viem";
import { anvil } from "viem/chains";
import type { ChainReader } from "../../lib/chain";
import { rpcHandler } from "../fixtures/rpc";
import { type Fixture, REGISTRY, RESOLVER } from "../fixtures/stamp";

export function mockClient(f: Fixture, opts: { tamperCode?: boolean } = {}): PublicClient {
  const h = rpcHandler(f, opts);
  return createPublicClient({
    chain: anvil,
    transport: custom({
      async request({ method, params }) {
        const r = h({ jsonrpc: "2.0", id: 1, method, params }) as {
          result?: unknown;
          error?: { message: string };
        };
        if (r.error) throw new Error(r.error.message);
        return r.result;
      },
    }),
  }) as PublicClient;
}

export function mockReader(f: Fixture, n = 2, tamperLast = false): ChainReader {
  return {
    chainId: 31337,
    registry: REGISTRY,
    resolver: RESOLVER,
    clients: Array.from({ length: n }, (_, i) =>
      mockClient(f, { tamperCode: tamperLast && i === n - 1 }),
    ),
  };
}
