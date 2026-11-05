# stamper-explorer

The public check site: open a stamp by code or QR, see what the chain recorded, compare your copy
with the stored original (fetched from Filecoin and re-hashed in the browser), or drop a file to find
its stamp. Every verdict is re-checked in the browser against two RPCs; the api is only used for
presentation and search. Stamper Explorer's any-image checks (C2PA, metadata, forensic signals) will
grow here.

## Stamper repos

| Repo | What |
|---|---|
| [stamper-protocol](https://github.com/stamper-media/stamper-protocol) | FEVM contracts, the shared `@stamper/*` packages (npm), infra and design docs |
| [stamper-services](https://github.com/stamper-media/stamper-services) | custodian api + worker, ml sidecar, whole-flow e2e |
| [stamper-app](https://github.com/stamper-media/stamper-app) | stamp from the browser (web) and the phone (iOS, Android) |
| [stamper-explorer](https://github.com/stamper-media/stamper-explorer) | the public check site: stamp pages, QR, compare, check a file |

Clone them side by side (`stamper-protocol/`, `stamper-services/`, … in one folder): scripts that need
another repo look for it there, or in `STAMPER_<NAME>_DIR`.

## What is here

| Path | Package | What |
|---|---|---|
| `apps/web` | `@stamper/explorer` | Next.js: `/v/<code>`, `/s/<code>`, `/scan`, `/status`, `/about`, check a file |

## Commands

```sh
pnpm install
pnpm dev                    # http://localhost:3000; NEXT_PUBLIC_CHAIN_ID=314159 reads Calibration
pnpm build && pnpm test
pnpm test:e2e               # Playwright against fixtures (next build + start)
pnpm lint && pnpm typecheck
```

Settings (`NEXT_PUBLIC_*`, baked in at build time): `CHAIN_ID`, `RPC_URLS` (≥ 2 in production),
`REGISTRY_ADDRESS` (defaults to the deployment in `@stamper/contracts-abi`), `API_URL` (optional),
`FILBEAM_PAYER`, `APP_URL` (the capture app, linked from the header), `EXAMPLES`.

## @stamper/* packages

From npm once `stamper-protocol` publishes them; until then from `vendor/*.tgz` (`scripts/sync-protocol.sh`).

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
