import { redirect } from "next/navigation";

/** Forensic QR path `/v/<code>/c/<PieceCID>`: the code alone selects the stamp. */
export default async function ForensicPath({ params }: { params: Promise<{ code: string }> }) {
  redirect(`/v/${encodeURIComponent((await params).code)}`);
}
