/**
 * Typed client for the WP-07 presentation DTOs. Presentation only: no verdict depends on anything here,
 * and every call degrades to `{ ok: false }` instead of throwing.
 */
import { z } from "zod";
import { getConfig } from "./config";

const hex = z.string().regex(/^0x[0-9a-fA-F]*$/);
const dec = z.string().regex(/^\d+$/);

export const bindingDtoSchema = z.object({
  slot: z.number().int().min(0).max(7),
  asset: z.number().int(),
  dataSetId: dec,
  pieceId: dec,
  providerId: dec,
  serviceUrl: z.string(),
  boundEpoch: dec,
  lastProbeAt: z.string().optional(),
  lastOkAt: z.string().optional(),
  probeFailures: z.number().int().nonnegative(),
});

export const stampPresentationSchema = z.object({
  code9: z.string().length(9),
  stampId: hex,
  status: z.string(),
  finality: z.enum(["pending", "included", "safe", "final"]),
  level: z.number().int(),
  effectiveLevel: z.number().int(),
  tier: z.object({ headline: z.string(), means: z.string(), doesNotMean: z.string() }),
  footer: z.string(),
  flags: z.array(z.string()),
  resolverFlag: z.string().nullable(),
  mediaKind: z.union([z.literal(1), z.literal(2)]),
  mime: z.string(),
  contentHash: hex,
  pieceCid: z.string(),
  pieceCidHex: hex,
  contentLength: dec,
  width: z.number().optional(),
  height: z.number().optional(),
  durationMs: z.number().optional(),
  capturedAt: z.string(),
  receivedAt: z.string(),
  registeredEpoch: dec.optional(),
  registeredAtUtc: z.string().optional(),
  registerTx: hex.optional(),
  countersigner: hex.optional(),
  keyId: hex,
  keyType: z.number().int(),
  registrar: hex.optional(),
  registrarRemovedAt: z.string().optional(),
  revokedEpoch: dec.optional(),
  renditions: z
    .object({
      share: z.string().optional(),
      shareCard: z.string().optional(),
      preview: z.string().optional(),
      thumb: z.string().optional(),
    })
    .partial(),
  derivatives: z.array(
    z.object({ kind: z.number().int(), sha256: hex, paramsHash: hex, attachTx: hex.optional() }),
  ),
  bindings: z.array(bindingDtoSchema),
  originalSources: z.object({
    filbeam: z.string().optional(),
    providers: z.array(z.string()),
    mirror: z.string(),
  }),
  storageState: z.enum(["pending", "bound", "unavailable"]),
  explorers: z.object({ blockscout: z.string(), filfox: z.string() }),
  /** public CaptureRecord, DAG-CBOR in base64; checked against the on-chain recordHash before use */
  record: z.string().nullable().optional(),
  /** Optional: registrar countersignature bytes (66 B) for in-browser recovery. */
  countersig: hex.optional(),
});

export type StampPresentation = z.infer<typeof stampPresentationSchema>;
export type BindingDto = z.infer<typeof bindingDtoSchema>;

export const verifyJobSchema = z.object({
  status: z.enum(["queued", "running", "done", "failed"]),
  result: z
    .object({
      verdict: z.enum(["ORIGINAL", "STAMPER_MARKED_COPY", "RELATED_COMPARE", "NOT_REGISTERED"]),
      path: z.string(),
      stampId: hex.optional(),
      code9: z.string().optional(),
      candidates: z
        .array(
          z.object({
            stampId: hex,
            code9: z.string().optional(),
            distance: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
});
export type VerifyJob = z.infer<typeof verifyJobSchema>;

/** A value the api reads from the chain as a decimal string (epochs, ids, wei). */
const decimal = z.union([z.string(), z.number()]).transform(String);
/** The api reports a failed read in place of the value. */
const readFailed = z.object({ error: z.string() });
const dataSetHealthSchema = z
  .object({
    dataSetId: decimal,
    live: z.boolean(),
    listenerIsFwss: z.boolean().optional(),
    lastProvenEpoch: decimal.nullable().optional(),
    nextChallengeEpoch: decimal.nullable().optional(),
    provenThisPeriod: z.boolean().nullable().optional(),
    provingDeadline: decimal.nullable().optional(),
    pdpEndEpoch: decimal.nullable().optional(),
    providerId: decimal.nullable().optional(),
  })
  .passthrough();
export type DataSetHealth = z.infer<typeof dataSetHealthSchema>;

/** GET /v1/health/storage, as stamper-services' api serves it (data sets keyed by slot A, B). */
export const storageHealthSchema = z
  .object({
    chainId: z.number().optional(),
    focMode: z.string().optional(),
    dataSets: z.record(z.string(), z.union([dataSetHealthSchema, readFailed])).default({}),
    runway: z
      .union([
        z
          .object({ days: z.number().nullable().optional(), fundedUntilEpoch: decimal.optional() })
          .passthrough(),
        readFailed,
      ])
      .optional(),
    relayer: z
      .object({
        address: z.string().optional(),
        balanceWei: z.union([decimal, readFailed]).optional(),
      })
      .passthrough()
      .optional(),
    sessionKey: z
      .union([
        z
          .object({
            expiresAt: z.string().nullable().optional(),
            secondsLeft: z.number().nullable().optional(),
          })
          .passthrough(),
        readFailed,
      ])
      .optional(),
    checkedAt: z.string().optional(),
  })
  .passthrough();
export type StorageHealth = z.infer<typeof storageHealthSchema>;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; error: string };

type Fetch = typeof fetch;

async function getJson<T>(
  url: string,
  schema: z.ZodType<T>,
  f: Fetch,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  try {
    const res = await f(url, { headers: { accept: "application/json" }, signal });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err =
        body && typeof body === "object" && "error" in body ? String(body.error) : res.statusText;
      return { ok: false, status: res.status, error: err };
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { ok: false, status: res.status, error: "bad response shape" };
    return { ok: true, data: parsed.data };
  } catch (e) {
    return { ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export class ApiClient {
  constructor(
    readonly base: string | null,
    private readonly f: Fetch = (...a) => fetch(...a),
  ) {}

  static fromConfig(): ApiClient {
    return new ApiClient(getConfig().apiUrl);
  }

  url(path: string): string | null {
    return this.base ? `${this.base}${path}` : null;
  }

  stampPath(code9: string, file: string): string | null {
    return this.url(`/v1/stamps/${encodeURIComponent(code9)}/${file}`);
  }

  async presentation(code9: string, signal?: AbortSignal): Promise<ApiResult<StampPresentation>> {
    const u = this.url(`/v1/stamps/${encodeURIComponent(code9)}`);
    if (!u) return { ok: false, status: null, error: "api disabled" };
    return getJson(u, stampPresentationSchema, this.f, signal);
  }

  async storageHealth(signal?: AbortSignal): Promise<ApiResult<StorageHealth>> {
    const u = this.url("/v1/health/storage");
    if (!u) return { ok: false, status: null, error: "api disabled" };
    return getJson(u, storageHealthSchema as z.ZodType<StorageHealth>, this.f, signal);
  }

  async submitUpload(file: Blob, name = "copy"): Promise<ApiResult<{ jobId: string }>> {
    const u = this.url("/v1/verify/upload");
    if (!u) return { ok: false, status: null, error: "api disabled" };
    try {
      const fd = new FormData();
      fd.append("file", file, name);
      const res = await this.f(u, { method: "POST", body: fd });
      const body: unknown = await res.json().catch(() => null);
      const parsed = z.object({ jobId: z.string().min(1) }).safeParse(body);
      if (!res.ok || !parsed.success)
        return { ok: false, status: res.status, error: "upload refused" };
      return { ok: true, data: parsed.data };
    } catch (e) {
      return { ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async job(jobId: string, signal?: AbortSignal): Promise<ApiResult<VerifyJob>> {
    const u = this.url(`/v1/verify/jobs/${encodeURIComponent(jobId)}`);
    if (!u) return { ok: false, status: null, error: "api disabled" };
    return getJson(u, verifyJobSchema, this.f, signal);
  }

  /** Polls until done/failed or `maxMs`. */
  async waitForJob(jobId: string, maxMs = 60_000, everyMs = 1_000): Promise<ApiResult<VerifyJob>> {
    const until = Date.now() + maxMs;
    for (;;) {
      const r = await this.job(jobId);
      if (!r.ok || r.data.status === "done" || r.data.status === "failed") return r;
      if (Date.now() > until) return { ok: false, status: null, error: "timeout" };
      await new Promise((res) => setTimeout(res, everyMs));
    }
  }
}
