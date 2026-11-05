import { VERIFY } from "../lib/copy";
import { percent } from "../lib/format";

export function DiffOverlay(props: { diffUrl: string; ratio: number; ssim: number }) {
  return (
    <figure className="diff" data-testid="diff-overlay">
      <img src={props.diffUrl} alt="Diff map" />
      <figcaption>
        {VERIFY.diffLegend(percent(props.ratio))}
        {Number.isFinite(props.ssim) ? <> · {VERIFY.ssimLine(props.ssim.toFixed(4))}</> : null}
      </figcaption>
    </figure>
  );
}
