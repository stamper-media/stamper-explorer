import { formatCode, normaliseCode } from "@stamper/core";
import type { Metadata } from "next";
import Link from "next/link";
import { FailureScreen } from "../../../components/FailureScreen";
import { getConfig } from "../../../lib/config";
import { SHARE } from "../../../lib/copy";

type Props = { params: Promise<{ code: string }> };

function shareCard(code9: string): string | null {
  const api = getConfig().apiUrl;
  return api ? `${api}/v1/stamps/${code9}/share-card.png` : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = normaliseCode(decodeURIComponent((await params).code));
  if (!n.ok) return { title: "Invalid code" };
  const img = shareCard(n.code9);
  const title = SHARE.title(n.code9);
  return {
    title,
    description: SHARE.description,
    alternates: { canonical: `/v/${n.code9}` },
    openGraph: {
      title,
      description: SHARE.description,
      images: img ? [{ url: img, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SHARE.description,
      images: img ? [img] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const n = normaliseCode(decodeURIComponent((await params).code));
  if (!n.ok) return <FailureScreen kind="invalid-code" />;
  const img = shareCard(n.code9);
  return (
    <div className="share">
      <h1>{SHARE.title(n.code9)}</h1>
      {img ? (
        <img src={img} alt={`Share card for ${formatCode(n.code9)}`} width={1200} height={630} />
      ) : null}
      <p>{SHARE.description}</p>
      <Link className="btn primary" href={`/v/${n.code9}`}>
        {SHARE.open}
      </Link>
    </div>
  );
}
