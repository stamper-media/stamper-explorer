import Link from "next/link";
import { CodeInput } from "../components/CodeInput";
import { CopyCheckProvider } from "../components/CopyCheck";
import { Examples } from "../components/Examples";
import { HomeCheck } from "../components/HomeCheck";
import { HowItWorks } from "../components/HowItWorks";
import { UseCases } from "../components/UseCases";
import { getConfig } from "../lib/config";
import { HOME } from "../lib/copy";

export default function Home() {
  const { examples } = getConfig();
  return (
    <div className="home">
      <CopyCheckProvider>
        <section className="hero">
          <div className="hero-copy">
            <span className="label">{HOME.eyebrow}</span>
            <h1>
              {HOME.heroTitle} <em>{HOME.heroAccent}</em>
            </h1>
            <p className="lede">{HOME.heroLede}</p>
            <a className="powered" href="https://filecoin.io" rel="noreferrer">
              <img
                className="powered-mark"
                src="/brand/filecoin-mark.svg"
                alt=""
                width={22}
                height={22}
              />
              <span className="powered-by">{HOME.powered.by}</span>
              <span className="powered-name">{HOME.powered.name}</span>
              <span className="powered-detail">{HOME.powered.detail}</span>
            </a>
            <Examples examples={examples} />
          </div>
          <div className="check-card">
            <CodeInput />
            <div className="or">{HOME.or}</div>
            <HomeCheck>
              <div className="check-actions">
                <Link className="btn" href="/scan">
                  {HOME.scanCta}
                </Link>
              </div>
            </HomeCheck>
          </div>
        </section>
      </CopyCheckProvider>

      <HowItWorks />

      <UseCases />
    </div>
  );
}
