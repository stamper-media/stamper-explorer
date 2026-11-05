"use client";
import { ERRORS } from "../../../lib/copy";

export default function VerifyError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="failure" role="alert">
      <h2>{ERRORS.generic}</h2>
      <button type="button" className="btn" onClick={reset}>
        {ERRORS.retry}
      </button>
    </section>
  );
}
