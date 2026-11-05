"use client";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { VERIFY } from "../lib/copy";

export function CompareSlider({ original, copy }: { original: string; copy: string }) {
  return (
    <figure className="compare" data-testid="compare-slider">
      <ReactCompareSlider
        itemOne={<ReactCompareSliderImage src={original} alt="Stored original" />}
        itemTwo={<ReactCompareSliderImage src={copy} alt="Your copy" />}
      />
      <figcaption className="muted">{VERIFY.compareHint}</figcaption>
    </figure>
  );
}
