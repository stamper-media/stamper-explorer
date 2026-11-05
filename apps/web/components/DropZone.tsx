"use client";
import { type DragEvent, useId, useState } from "react";
import { HOME } from "../lib/copy";

export function DropZone(props: {
  onFile: (f: File) => void;
  busy?: string | null;
  title?: string;
  hint?: string;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) props.onFile(f);
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop is additive; the file input is the accessible path
    <section
      className={`dropzone${over ? " over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      data-testid="dropzone"
    >
      <h2>{props.title ?? HOME.dropTitle}</h2>
      <p className="muted">{props.busy ?? props.hint ?? HOME.dropHint}</p>
      <label htmlFor={id} className="btn">
        {HOME.dropButton}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*,video/*"
        className="visually-hidden"
        data-testid="file-input"
        disabled={!!props.busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onFile(f);
          e.target.value = "";
        }}
      />
    </section>
  );
}
