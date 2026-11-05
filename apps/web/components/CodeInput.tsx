"use client";
import { normaliseCode } from "@stamper/core";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { CODE_ERRORS, HOME } from "../lib/copy";

/** Normalisation is delegated to core.normaliseCode (lenient: case, I/L/O, separators). */
export function CodeInput({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    const n = normaliseCode(value);
    if (!n.ok) {
      setError(CODE_ERRORS[n.reason]);
      return;
    }
    setError(null);
    router.push(`/v/${n.code9}`);
  }
  return (
    <form className="code-input" onSubmit={submit} noValidate>
      <label htmlFor="code">{HOME.codeLabel}</label>
      <div className="row">
        <input
          id="code"
          name="code"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={HOME.codePlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={20}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-hint" : undefined}
        />
        <button type="submit" className="btn primary">
          {HOME.codeSubmit}
        </button>
      </div>
      {error ? (
        <p id="code-hint" className="error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
