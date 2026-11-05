import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../components/Logo";
import { getConfig } from "../lib/config";
import { SITE } from "../lib/copy";
import "./globals.css";
import "./how.css";

export const metadata: Metadata = {
  metadataBase: new URL(getConfig().origin),
  title: { default: SITE.product, template: `%s · ${SITE.product}` },
  description: SITE.tagline,
  icons: { icon: [{ url: "/brand/stamper-mark.svg", type: "image/svg+xml" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0a12" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const network = SITE.network[getConfig().chainId];
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav className="site-nav">
            <Link href="/" className="brand" aria-label={SITE.product}>
              <Logo height={26} />
              <span className="brand-sub" aria-hidden="true">
                explorer
              </span>
            </Link>
            <span className="nav-links">
              {network ? <span className="network">{network}</span> : null}
              <Link href="/scan">{SITE.nav.scan}</Link>
              <Link href="/status">{SITE.nav.status}</Link>
              <Link href="/about">{SITE.nav.about}</Link>
              {getConfig().appUrl ? (
                <a className="nav-cta" href={getConfig().appUrl ?? ""}>
                  <span className="nav-cta-mark" aria-hidden="true" />
                  {SITE.nav.stamp}
                </a>
              ) : null}
            </span>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer" data-testid="footer">
          <div className="site-footer-inner">
            <div>
              <p className="footer-credit">
                Developed by{" "}
                <a href="https://tinfoil.art" rel="noreferrer">
                  Tinfoil
                </a>
              </p>
            </div>
            <span className="footer-links">
              <Link href="/about">{SITE.footerLinks.about}</Link>
              <Link href="/status">{SITE.footerLinks.status}</Link>
              <a href="https://filecoin.io" rel="noreferrer">
                {SITE.footerLinks.filecoin}
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
