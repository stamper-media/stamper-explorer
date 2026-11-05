// Copies the zxing reader wasm next to the site so the QR scanner never loads it from a CDN.
import { copyFileSync, mkdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bd = dirname(realpathSync(require.resolve("barcode-detector/ponyfill")));
const wasm = join(bd, "..", "..", "..", "zxing-wasm", "dist", "reader", "zxing_reader.wasm");
mkdirSync(join(here, "..", "public"), { recursive: true });
copyFileSync(wasm, join(here, "..", "public", "zxing_reader.wasm"));
