import type { Metadata } from "next";
import { StatusView } from "../../components/StatusView";
import { STATUS } from "../../lib/copy";

export const metadata: Metadata = { title: STATUS.title };

export default function StatusPage() {
  return (
    <div>
      <h1>{STATUS.title}</h1>
      <p className="lede">{STATUS.intro}</p>
      <StatusView />
    </div>
  );
}
