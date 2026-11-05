/**
 * A copy checked on the home page, carried to /v/<code> so the stamp page compares it on arrival.
 * Module state: it survives client-side navigation only, and is read once.
 */
let pending: { code9: string; file: File } | null = null;

export function handOff(code9: string, file: File): void {
  pending = { code9, file };
}

export function takeHandoff(code9: string): File | null {
  if (pending?.code9 !== code9) return null;
  const { file } = pending;
  pending = null;
  return file;
}
