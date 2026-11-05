import type { ReactNode } from "react";
import { FAILURES, type FailureKind } from "../lib/copy";

export function FailureScreen(props: {
  kind: FailureKind;
  inline?: boolean;
  detail?: ReactNode;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const c = FAILURES[props.kind];
  return (
    <section
      className={props.inline ? "notice" : "failure"}
      role={props.inline ? "status" : "alert"}
      data-testid={`failure-${props.kind}`}
    >
      <h2>{c.title}</h2>
      <p>{c.body}</p>
      {props.detail ? <div className="detail">{props.detail}</div> : null}
      {props.children}
      {c.action && props.onAction ? (
        <button type="button" className="btn" onClick={props.onAction}>
          {c.action}
        </button>
      ) : null}
    </section>
  );
}
