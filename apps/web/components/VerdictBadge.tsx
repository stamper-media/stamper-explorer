import type { Tone } from "../lib/verdict";

export function VerdictBadge({ tone, label }: { tone: Tone | "pending"; label: string }) {
  return (
    <span className={`badge badge-${tone}`} data-testid="verdict">
      {label}
    </span>
  );
}
