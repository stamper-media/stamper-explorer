import type { TierSentence } from "@stamper/core";
import type { Tone } from "../lib/verdict";
import { VerdictBadge } from "./VerdictBadge";

/** DESIGN §8.2 item 1: outcome × capture-tier sentence. The footer sits in the site layout. */
export function Header(props: {
  label: string;
  tone: Tone | "pending";
  tier: TierSentence | null;
  sub?: string;
}) {
  return (
    <header className="verdict-header">
      <h1>
        <VerdictBadge tone={props.tone} label={props.label} />
      </h1>
      {props.tier ? (
        <p className="tier" data-testid="tier">
          {props.tier.headline}
        </p>
      ) : null}
      {props.sub ? <p className="muted">{props.sub}</p> : null}
    </header>
  );
}
