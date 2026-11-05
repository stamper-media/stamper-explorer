"use client";
import { useEffect, useRef, useState } from "react";
import { HOME } from "../lib/copy";

/**
 * "How a stamp works": three cards, each with a small animated scene. The scenes share one 6 s
 * cycle and play one after another (capture → anchor → check). They animate only while the section
 * is on screen; with reduced motion they show their final state, still.
 */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [capture, anchor, check] = HOME.steps;
  return (
    <section ref={ref} className={`how${inView ? " in-view" : ""}`} aria-labelledby="how-title">
      <div className="section-head">
        <h2 id="how-title">{HOME.howTitle}</h2>
        <p className="muted">{HOME.howLede}</p>
      </div>
      <ol className="how-steps">
        <Step step={capture} scene={<CaptureScene />} />
        <Arrow />
        <Step step={anchor} scene={<AnchorScene />} />
        <Arrow />
        <Step step={check} scene={<CheckScene />} />
      </ol>
    </section>
  );
}

type StepCopy = { n: string; title: string; body: string };

function Step({ step, scene }: { step: StepCopy | undefined; scene: React.ReactNode }) {
  if (!step) return null;
  return (
    <li className="how-step">
      <div className="how-scene">{scene}</div>
      <span className="step-n">{step.n}</span>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
    </li>
  );
}

function Arrow() {
  return (
    <li className="how-arrow" aria-hidden="true">
      <span className="how-arrow-line" />
      <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
        <path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </li>
  );
}

/** 01 · Capture: the viewfinder focuses, a scan line hashes the frame, the hash types out, signed. */
function CaptureScene() {
  return (
    <svg viewBox="0 0 220 140" className="how-svg" aria-hidden="true">
      <rect x="62" y="16" width="96" height="68" rx="3" className="s-photo" />
      <circle cx="134" cy="34" r="8" className="s-sun" />
      <path d="M62 84 L88 56 L102 70 L120 48 L158 84 Z" className="s-hill" />
      <rect x="62" y="16" width="96" height="2.5" className="s-scan" />
      <path d="M54 26v-16h16 M150 10h16v16 M166 74v16h-16 M70 90h-16v-16" className="s-bracket" />
      <text x="110" y="110" className="s-mono" textAnchor="middle">
        sha256 9f3a…c21e
      </text>
      <rect x="44" y="99" width="132" height="15" className="s-cover" />
      <g className="s-signed">
        <rect x="80" y="121" width="60" height="16" rx="8" className="s-pill" />
        <text x="110" y="132" className="s-pill-text" textAnchor="middle">
          SIGNED ✓
        </text>
      </g>
    </svg>
  );
}

/** 02 · Anchor: a new block lands on the chain; the original flows to two providers that prove it. */
function AnchorScene() {
  return (
    <svg viewBox="0 0 220 140" className="how-svg" aria-hidden="true">
      {[18, 64, 110].map((x) => (
        <rect key={x} x={x} y="14" width="30" height="30" rx="5" className="s-block" />
      ))}
      <path d="M48 29h16 M94 29h16" className="s-chain" />
      <path d="M140 29h16" className="s-link" />
      <g className="s-newblock">
        <rect x="156" y="14" width="30" height="30" rx="5" className="s-block-new" />
        <path d="M171 21l8 8-8 8-8-8z" className="s-diamond" />
      </g>
      <path d="M171 46 C171 66 79 62 79 82 M171 46 C171 66 147 64 147 82" className="s-flow" />
      {[
        { cx: 79, label: "SP A" },
        { cx: 147, label: "SP B" },
      ].map((sp) => (
        <g key={sp.cx}>
          <circle cx={sp.cx} cy="102" r="20" className="s-ring" />
          <path
            d={`M${sp.cx - 16} 90 v20 a16 5 0 0 0 32 0 v-20 a16 5 0 0 0 -32 0 a16 5 0 0 0 32 0`}
            className="s-disk"
          />
          <text x={sp.cx} y="134" className="s-mono s-small" textAnchor="middle">
            {sp.label}
          </text>
          <text x={sp.cx + 22} y="88" className="s-pdp">
            PDP ✓
          </text>
        </g>
      ))}
    </svg>
  );
}

/** 03 · Check: the copy's hash and the chain's light up group by group, then the check draws. */
function CheckScene() {
  const groups = ["9f3a", "77c2", "e1b0"];
  return (
    <svg viewBox="0 0 220 140" className="how-svg" aria-hidden="true">
      {[
        { y: 30, label: "copy" },
        { y: 56, label: "chain" },
      ].map((row) => (
        <g key={row.label}>
          <text x="22" y={row.y} className="s-mono s-small s-muted">
            {row.label}
          </text>
          {groups.map((g, i) => (
            <g key={g}>
              <rect
                x={70 + i * 44}
                y={row.y - 12}
                width="40"
                height="17"
                rx="3"
                className={`s-group s-g${i + 1}`}
              />
              <text x={90 + i * 44} y={row.y} className="s-mono" textAnchor="middle">
                {g}
              </text>
            </g>
          ))}
        </g>
      ))}
      <circle cx="110" cy="96" r="16" className="s-check-circle" />
      <path d="M102 96l6 6 11-12" className="s-check" />
      <text x="110" y="132" className="s-mono s-small s-ok" textAnchor="middle">
        ORIGINAL
      </text>
    </svg>
  );
}
