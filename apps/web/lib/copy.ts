/**
 * Every user-facing string of the verify site (plan §WP-09). Tier sentences and the footer come from
 * @stamper/core only (plan §4.10) and are re-exported, never rewritten. The banned words
 * (plan §0.6) never appear here; tests/unit/copy.test.ts enforces it over this table and every screen.
 */
import { FOOTER, formatCode, tierSentence, verdictLabel } from "@stamper/core";

export { FOOTER, tierSentence, verdictLabel };

export const SITE = {
  name: "Stamper",
  product: "Stamper Explorer",
  tagline:
    "Check when a photo or video was registered, and whether your copy is the stored original.",
  nav: {
    home: "Check",
    stamp: "Stamp media",
    scan: "Scan QR",
    status: "Status",
    about: "What a stamp proves",
  },
  network: { 31337: "Local chain", 314159: "Calibration testnet", 314: "" } as Record<
    number,
    string
  >,
  footerLinks: {
    about: "What a stamp proves",
    status: "Service status",
    filecoin: "Built on Filecoin",
  },
} as const;

export const HOME = {
  title: "Check a stamp",
  codeLabel: "Stamp code",
  codePlaceholder: "XXXX-XXXX-X",
  codeSubmit: "Open stamp",
  scanCta: "Scan a QR code",
  dropTitle: "Check a copy",
  dropHint: "Drop a photo or video here, or choose a file. It is hashed in this browser first.",
  dropButton: "Choose a file",
  hashing: "Hashing in this browser…",
  searching: "Asking Stamper to search for related stamps…",
  loadingExample: "Loading the example copy…",
  opening: "Found it. Opening the stamp to compare…",
  foundBy: {
    perceptual:
      "Found by its perceptual hash: your copy is not the stored file, but it looks close to it.",
    watermark: "Found by the invisible watermark Stamper puts on the copies it shares.",
  },
  distance: (bits: number) => `${bits} bits from your copy (PDQ)`,
  compareCta: "Compare with the stored original",
  eyebrow: "Open, decentralized media attestation",
  heroTitle: "Is this original?",
  heroAccent: "Check it onchain.",
  heroLede:
    "Stamper records a photo or video the moment it is taken. Anyone can check it against the blockchain.",
  powered: { by: "Powered by", name: "Filecoin", detail: "Onchain Cloud · PDP proofs" },
  or: "or",
  examplesTitle: "Try an example",
  exampleDemoSub: "Demo stamp",
  exampleCopySub: "Edited copy",
  useCasesTitle: "Who it's for",
  useCasesLede:
    "Journalists and newsrooms, human-rights documenters, citizen reporters, creators and public figures: anyone who must later show when a picture was taken and that it was not altered.",
  useCases: [
    {
      id: "newsroom",
      tab: "Newsrooms",
      title: "A news photo every reader can check",
      body: "The photographer's phone stamps the picture as it is taken. The newsroom prints its code and QR, and any reader opens the stamp and checks it onchain.",
    },
    {
      id: "evidence",
      tab: "Human-rights documentation",
      title: "Evidence that holds up years later",
      body: "Video is stamped as it is filmed and kept by two Filecoin providers that prove every day they still hold it. Years later, anyone can show when it was recorded and that it was not altered.",
    },
    {
      id: "viral",
      tab: "Public figures and creators",
      title: "Find the original behind any copy",
      body: "When a stamped photo spreads, resized, re-encoded or edited, Stamper Explorer finds the original from the copy and shows what changed.",
    },
  ],
  howTitle: "How a stamp works",
  howLede: "Three steps, each one public and repeatable.",
  steps: [
    {
      n: "01 · Capture",
      title: "Signed on the device",
      body: "The Stamper app, on a phone or in the browser, hashes the photo or video as it is taken and signs a claim with the device's key.",
    },
    {
      n: "02 · Anchor",
      title: "Recorded on Filecoin",
      body: "The claim is registered on the Filecoin EVM, and two independent storage providers keep the original and prove it every day.",
    },
    {
      n: "03 · Check",
      title: "Open to anyone",
      body: "Anyone with the code can rerun every check on this site, or with nothing but cast and curl.",
    },
  ],
} as const;

export const CODE_ERRORS: Record<"non-ascii" | "length" | "symbol" | "check", string> = {
  "non-ascii": "Use only Latin letters and digits.",
  length: "A stamp code has nine symbols.",
  symbol: "That code contains a symbol stamp codes never use.",
  check: "The last symbol does not fit the others — a symbol was probably mistyped.",
};

export const VERIFY = {
  loadingChain: "Reading the chain…",
  registered: "REGISTERED",
  fetchingLine: "fetching the original…",
  hashAgrees: "hash agrees with chain ✓",
  hashDisagrees: "the fetched bytes do not hash to the registered value",
  hashChecking: "fetching…",
  compareTitle: "Compare",
  compareHint: "Drag the handle to compare the stored original with your copy.",
  dropYourCopy: "Drop your copy to compare it with this stamp",
  diffLegend: (pct: string) => `Pixels that differ: ${pct} (highlighted in red)`,
  ssimLine: (v: string) => `Structural similarity (SSIM): ${v}`,
  hashOnlyLine: "Hash-only comparison: your copy's SHA-256 is checked against the chain.",
  rpcDisagree:
    "The two chain endpoints returned different answers. Treat this page with caution and retry.",
  rpcSingle: "Only one chain endpoint answered; the second one could not be compared.",
  presentationUnavailable: "Stamper's presentation service is unreachable; chain data is shown.",
  presentationUnknown:
    "This Stamper server holds no record of this stamp, so only what the chain and Filecoin hold is shown.",
  video: "Video: the stored original and your copy play side by side.",
  stampCode: "Stamp code",
  frameLoading: "Fetching the original…",
  frameUnavailable: "Original not available here",
  demo: "Demo stamp · simulated device",
  facts: { captured: "Captured", registered: "Registered", device: "Device", location: "Location" },
  locationNone: "not recorded",
  checksTitle: "Checks",
  checksSummary: (n: number, held: number, pending: number) =>
    `${n} checks · ${held} hold${pending ? ` · ${pending} pending` : ""}`,
  checks: {
    signature: "Device signature recovers to the enrolled key",
    claim: "Claim rebuilt from chain state",
    countersig: "Countersigned by the registrar",
    key: "Device key not revoked",
    binding: (set: string) => `Stored as a live piece in data set ${set}`,
    proven: (set: string) => `Proven this proving period (data set ${set})`,
    original: "Original re-hashed in this browser",
    record: "Capture record agrees with the chain",
    registered: "Registered on chain",
  },
} as const;

export const LOCATION = {
  title: "Location",
  meta: "Approximate area, recorded by the device",
  cell: "Area",
  size: "Size",
  sizeValue: "0.01° × 0.01° (about 1.1 km north–south)",
  source: "Fix from",
  sources: {
    gps: "GPS",
    network: "network",
    fused: "GPS and network",
    unknown: "unknown",
  } as Record<string, string>,
  sealed: "Exact position",
  sealedValue: "sealed by the author; committed in the record",
  openMap: "Open this area in OpenStreetMap",
  note: "The phone reported this position when the picture was taken. Stamper does not check it against the scene, and a phone's position can be spoofed.",
  short: (lat: string, lon: string) => `${lat}, ${lon} · about 1 km`,
} as const;

export const RECORD = {
  title: "Record",
  code: "Code",
  stampId: "Stamp id",
  sha256: "SHA-256",
  pieceCid: "PieceCID",
  size: "Size",
  capturedAt: "Captured (device clock)",
  receivedAt: "Received by Stamper",
  registeredAt: "Registered on chain",
  level: "Assurance level",
  means: "What this means",
  doesNotMean: "What this does not mean",
  keyId: "Device key",
  registrar: "Registrar",
  revocation: "Key revocation",
  notRevoked: "not revoked",
  copy: "Copy",
  copied: "Copied",
} as const;

export const CHAIN = {
  title: "Chain",
  tx: "Registration transaction",
  epoch: "Epoch",
  state: "State",
  states: { included: "included", safe: "safe", final: "final" } as const,
  sigOk: "signature re-checked in this browser ✓",
  sigFail: "the device signature did not check out in this browser",
  sigContract: "contract-wallet signature: checked by the chain at registration",
  claimRebuilt: "signed claim rebuilt from chain state ✓",
  claimNotRebuilt: "the claim deadline is not stored on chain; signature checked over the stamp id",
  countersigner: "Countersigner",
  countersigRecovered: "countersignature re-checked in this browser ✓",
  countersigChain: "countersignature checked by the chain at registration",
  noCountersig: "no countersignature",
  links: "Explorers",
  unknown: "unknown",
} as const;

export const STORAGE = {
  title: "Storage",
  lastCheck: (time: string) => `last retrieval check: ${time}, hash agreed`,
  lastCheckFailed: (time: string) => `last retrieval check: ${time}, it failed`,
  lastCheckUnknown: "last retrieval check: not available",
  provider: "Provider",
  dataSet: "Data set",
  pieceId: "Piece id",
  live: "Live",
  proven: "Proven this period",
  deadline: "Next proving deadline",
  faults: "Failed checks",
  payment: "Payment active",
  served: "Served these bytes",
  explorer: "PDP explorer",
  yes: "yes",
  no: "no",
  trusted: "bound by Stamper",
  untrusted: "bound by a third party",
} as const;

export const SOURCES: Record<"filbeam" | "provider" | "mirror", string> = {
  filbeam: "FilBeam (Filecoin retrieval CDN)",
  provider: "the storage provider",
  mirror: "Stamper's mirror",
};

export const EVIDENCE = {
  title: "Evidence",
  download: "Download evidence (JSON)",
  fromApi: "Full evidence bundle from Stamper",
} as const;

export type FailureKind =
  | "registering"
  | "proof-pending"
  | "original-unavailable"
  | "rejected"
  | "withdrawn"
  | "key-revoked"
  | "registrar-removed"
  | "several-candidates"
  | "mismatch"
  | "invalid-code"
  | "not-registered";

export type FailureCopy = { title: string; body: string; action?: string };

/** The eleven designed failure screens of DESIGN §8.2 (never toasts). */
export const FAILURES: Record<FailureKind, FailureCopy> = {
  registering: {
    title: "Registering",
    body: "This file was stamped moments ago. The code appears when the chain confirms, usually in under two minutes.",
    action: "Check again",
  },
  "proof-pending": {
    title: "Filecoin proof pending",
    body: "The original is registered on chain but not yet bound to Filecoin storage. Stamper is serving it in the meantime.",
  },
  "original-unavailable": {
    title: "Original temporarily unavailable",
    body: "No source could serve the original right now. You can still drop your copy for a hash-only comparison against the chain.",
    action: "Try again",
  },
  rejected: {
    title: "Rejected before publication",
    body: "Stamper refused this upload before it was published, so there is no stamp to show.",
  },
  withdrawn: {
    title: "Withdrawn",
    body: "The record stays on chain, but the file is no longer served.",
  },
  "key-revoked": {
    title: "Device key revoked after this stamp",
    body: "The device key was revoked after this file was registered. The stamp keeps the level it had when it was registered.",
  },
  "registrar-removed": {
    title: "Registrar removed",
    body: "The registrar that endorsed this device has since been removed from the registry.",
  },
  "several-candidates": {
    title: "Several candidates",
    body: "More than one stamp is close to your copy. None was picked for you; compare each one.",
  },
  mismatch: {
    title: "Your copy differs from the original",
    body: "Your copy is not byte-for-byte the stored original. The diff map shows where the pixels differ.",
  },
  "invalid-code": {
    title: "Invalid code",
    body: "The check symbol failed, so this code was mistyped or damaged. Check the nine symbols and try again.",
  },
  "not-registered": {
    title: "Not registered",
    body: "No registered original was found. That says nothing about whether the file is fake.",
  },
};

export const WITHDRAWN_REASON: Record<number, string> = {
  1: "Withdrawn by the author.",
  2: "Taken down for a legal reason.",
  3: "Disputed.",
  4: "Rejected before publication.",
  5: "The registrar was removed.",
};

export const SCAN = {
  title: "Scan a stamp QR code",
  start: "Start camera",
  stop: "Stop camera",
  fromFile: "Or decode a picture of the QR code",
  noCamera: "This browser cannot open the camera. Decode a picture instead.",
  notStamper: "That QR code is not a Stamper verify link.",
  found: (code: string) => `Found ${formatCode(code)} — opening…`,
  nothing: "No QR code was found in that picture.",
} as const;

export const STATUS = {
  title: "Storage status",
  intro:
    "Health of the Filecoin data sets that hold the originals, as Stamper's monitors last saw it.",
  unavailable: "The status service is unreachable right now.",
  dataSet: "Data set",
  provider: "Provider",
  live: "Live",
  lastProven: "Last proven",
  nextDeadline: "Next deadline",
  provenThisPeriod: "Proven this period",
  unreadable: "Could not be read from the chain just now.",
  runway: "Funding runway",
  days: (n: number) => `${Math.floor(n)} days`,
  fundedUntil: (t: string) => `funded until ${t}`,
  relayer: "Relayer balance",
  sessionKey: "Session key expires",
  checkedAt: "Checked",
  loading: "Loading…",
} as const;

export const SHARE = {
  title: (code: string) => `Stamp ${formatCode(code)}`,
  description: "Open the stamp to see when this file was registered and to compare your copy.",
  open: "Open the stamp",
} as const;

export const ERRORS = {
  generic: "Something went wrong while reading the chain.",
  retry: "Retry",
  noRpc: "No chain endpoint is configured for this site.",
} as const;

/** DESIGN §1.1–1.2, worded without the banned words (plan §0.6 overrides verbatim reuse). */
export const ABOUT = {
  title: "What a stamp proves",
  proves: [
    [
      "Identity of bytes",
      "The file's SHA-256 and its Filecoin PieceCID are fixed in the StampRegistry contract. Anyone holding a bit-for-bit copy can prove it with sha256sum; anyone downloading the piece re-derives both.",
    ],
    [
      "Device signature",
      "An enrolled device key signed the capture claim over those identifiers. The registry checked the signature on chain and stored it, so the check can be re-run forever from the chain alone — this site re-runs it in your browser.",
    ],
    [
      "Time (upper bound)",
      "The claim was included at a chain epoch whose timestamp is exact. The file existed no later than that instant. The device's capture time is a claim, shown separately.",
    ],
    [
      "Storage",
      "The file is a piece of one or more live Filecoin data sets, challenged several times per proving period, and Stamper's retrieval probe downloads and re-hashes it.",
    ],
    [
      "Assurance level",
      "The chain sets the level from the device key's endorsement by a governed registrar and either a per-capture countersignature or a hardware signature. Nothing else can raise a level.",
    ],
  ] as ReadonlyArray<readonly [string, string]>,
  notTitle: "What it does not prove",
  notProves: [
    "Not that the scene happened as shown (screens, prints and staging defeat any camera).",
    "Not that the phone was uncompromised (root exploits defeat attestation).",
    "Not that the clock or location was honest.",
    "Not that the person stamping consented, or is who an account says.",
    "Not that the earliest stamp belongs to the creator.",
    "Not that an unstamped file, or one that differs from the original, is fake.",
  ],
} as const;

export const LEVEL_NAMES: Record<number, string> = {
  0: "L0 — device not attested",
  1: "L1 — attested at upload",
  2: "L2 — hardware-attested",
};
