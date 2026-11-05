"use client";
import { useEffect, useRef, useState } from "react";
import { HOME } from "../lib/copy";

/**
 * "Who it's for": the use-case videos (public/use-cases/<id>.webm|mp4|jpg, rendered from
 * video/use-cases.html). They play one after another while the section is on screen; with reduced
 * motion nothing plays by itself and the player shows its controls.
 */
export function UseCases() {
  const items = HOME.useCases;
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const [still, setStill] = useState(false);
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setStill(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    const el = section.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting), {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // play only while on screen (and never by itself under reduced motion)
  useEffect(() => {
    const v = video.current;
    if (!v || still) return;
    if (onScreen) void v.play().catch(() => {});
    else v.pause();
  }, [onScreen, still, active]);

  const item = items[active] ?? items[0];
  if (!item) return null;
  const choose = (i: number) => {
    setProgress(0);
    setActive(i);
  };
  return (
    <section ref={section} className="usecases" aria-labelledby="usecases-title">
      <div className="section-head">
        <h2 id="usecases-title">{HOME.useCasesTitle}</h2>
        <p className="muted">{HOME.useCasesLede}</p>
      </div>
      <div className="uc-grid">
        <div className="uc-player" id="uc-panel" role="tabpanel" aria-label={item.title}>
          <video
            key={item.id}
            ref={video}
            muted
            playsInline
            preload="metadata"
            poster={`/use-cases/${item.id}.jpg`}
            controls={still}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={() => choose((active + 1) % items.length)}
          >
            <source src={`/use-cases/${item.id}.webm`} type="video/webm" />
            <source src={`/use-cases/${item.id}.mp4`} type="video/mp4" />
          </video>
        </div>
        <div className="uc-tabs" role="tablist" aria-label={HOME.useCasesTitle}>
          {items.map((u, i) => (
            <button
              key={u.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls="uc-panel"
              className={`uc-tab${i === active ? " active" : ""}`}
              onClick={() => choose(i)}
            >
              <span className="uc-tab-label">{u.tab}</span>
              <span className="uc-tab-title">{u.title}</span>
              {i === active ? <span className="uc-tab-body">{u.body}</span> : null}
              {i === active && !still ? (
                <span className="uc-progress" aria-hidden="true">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
