import { formatCode, normaliseCode } from "@stamper/core";
import type { Metadata } from "next";
import { FailureScreen } from "../../../components/FailureScreen";
import { VerifyView } from "../../../components/VerifyView";
import { CODE_ERRORS } from "../../../lib/copy";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = normaliseCode(decodeURIComponent((await params).code));
  return { title: n.ok ? formatCode(n.code9) : "Invalid code", robots: { index: false } };
}

/** Universal / App Link target. The code is validated here; everything else runs in the browser. */
export default async function VerifyPage({ params }: Props) {
  const raw = decodeURIComponent((await params).code);
  const n = normaliseCode(raw);
  if (!n.ok) {
    return (
      <FailureScreen
        kind="invalid-code"
        detail={<p className="muted">{CODE_ERRORS[n.reason]}</p>}
      />
    );
  }
  return <VerifyView code9={n.code9} />;
}
