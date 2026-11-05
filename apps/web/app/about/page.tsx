import type { Metadata } from "next";
import { ABOUT } from "../../lib/copy";

export const metadata: Metadata = { title: ABOUT.title };

export default function AboutPage() {
  return (
    <article className="about">
      <h1>{ABOUT.title}</h1>
      <ol>
        {ABOUT.proves.map(([h, p]) => (
          <li key={h}>
            <strong>{h}.</strong> {p}
          </li>
        ))}
      </ol>
      <h2>{ABOUT.notTitle}</h2>
      <ul>
        {ABOUT.notProves.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </article>
  );
}
