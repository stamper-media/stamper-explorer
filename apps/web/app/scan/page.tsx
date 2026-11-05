import type { Metadata } from "next";
import { Scanner } from "../../components/Scanner";
import { SCAN } from "../../lib/copy";

export const metadata: Metadata = { title: SCAN.title };

export default function ScanPage() {
  return (
    <div>
      <h1>{SCAN.title}</h1>
      <Scanner />
    </div>
  );
}
