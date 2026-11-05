"use client";
import { useState } from "react";
import { RECORD } from "../lib/copy";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? RECORD.copied : RECORD.copy}
    </button>
  );
}
