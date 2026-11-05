import { type ApproxLocation, cellBounds } from "@stamper/core";
import type { Hex } from "viem";
import { LOCATION } from "../lib/copy";
import { degrees } from "../lib/record";

/** OpenStreetMap opens only on click: the stamp page itself loads nothing from a map service. */
export function osmLink(cell: ApproxLocation): string {
  const b = cellBounds(cell);
  return `https://www.openstreetmap.org/?minlon=${b.west}&minlat=${b.south}&maxlon=${b.east}&maxlat=${b.north}&box=yes`;
}

export function shortLocation(cell: ApproxLocation): string {
  return LOCATION.short(degrees(cell.latE2 + 0.5, "N", "S"), degrees(cell.lonE2 + 0.5, "E", "W"));
}

/** The approximate cell on a coordinate grid: 5 × 3 cells of 0.01°, the recorded one in magenta. */
function CellMap({ cell }: { cell: ApproxLocation }) {
  const W = 64,
    x0 = 64,
    y0 = 28;
  const cols = [-2, -1, 0, 1, 2, 3];
  const rows = [2, 1, 0, -1];
  return (
    <svg className="cell-map" viewBox="0 0 416 236" role="img" aria-label={shortLocation(cell)}>
      {cols.map((c, i) => (
        <g key={`v${c}`}>
          <line className="grid" x1={x0 + i * W} x2={x0 + i * W} y1={y0} y2={y0 + 3 * W} />
          <text className="t" x={x0 + i * W} y={y0 - 10} textAnchor="middle">
            {((cell.lonE2 + c) / 100).toFixed(2)}
          </text>
        </g>
      ))}
      {rows.map((r, j) => (
        <g key={`h${r}`}>
          <line className="grid" x1={x0} x2={x0 + 5 * W} y1={y0 + j * W} y2={y0 + j * W} />
          <text className="t" x={x0 - 10} y={y0 + j * W + 3} textAnchor="end">
            {((cell.latE2 + r) / 100).toFixed(2)}
          </text>
        </g>
      ))}
      <rect className="cell" x={x0 + 2 * W} y={y0 + W} width={W} height={W} />
      <path className="seal" d={`M${x0 + 2.5 * W} ${y0 + 1.5 * W - 7}l7 7-7 7-7-7z`} />
    </svg>
  );
}

export function LocationPanel({
  cell,
  privateHash,
}: {
  cell: ApproxLocation;
  privateHash: Hex | null;
}) {
  const b = cellBounds(cell);
  return (
    <section className="panel" data-testid="location-panel">
      <div className="checks-summary">
        <h2>{LOCATION.title}</h2>
        <span className="label">{LOCATION.meta}</span>
      </div>
      <CellMap cell={cell} />
      <dl>
        <div className="kv">
          <dt>{LOCATION.cell}</dt>
          <dd>
            <code>
              {degrees(cell.latE2, "N", "S")} – {degrees(cell.latE2 + 1, "N", "S")},{" "}
              {degrees(cell.lonE2, "E", "W")} – {degrees(cell.lonE2 + 1, "E", "W")}
            </code>
          </dd>
        </div>
        <div className="kv">
          <dt>{LOCATION.size}</dt>
          <dd>{LOCATION.sizeValue}</dd>
        </div>
        <div className="kv">
          <dt>{LOCATION.source}</dt>
          <dd>{LOCATION.sources[cell.source] ?? cell.source}</dd>
        </div>
        <div className="kv">
          <dt>{LOCATION.sealed}</dt>
          <dd>
            {LOCATION.sealedValue}
            {privateHash ? (
              <>
                {" "}
                <code className="wrap">{privateHash}</code>
              </>
            ) : null}
          </dd>
        </div>
      </dl>
      <p className="small muted">{LOCATION.note}</p>
      <p className="small">
        <a
          href={osmLink(cell)}
          target="_blank"
          rel="noreferrer"
          data-bounds={`${b.south},${b.west},${b.north},${b.east}`}
        >
          {LOCATION.openMap} ↗
        </a>
      </p>
    </section>
  );
}
