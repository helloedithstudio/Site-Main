import type { Metadata, Viewport } from "next";
import { seo } from "@/lib/content";
import { socialLinks } from "@/lib/brand";
import SiteShell from "@/components/SiteShell";
import "@/styles/fonts.css";
import "@/styles/site.css";
import "@/styles/scoped.css";
import "@/styles/chunks.css";
import "@/styles/edith.css";

export const metadata: Metadata = {
  metadataBase: new URL(seo.baseUrl),
  title: seo.title,
  description: seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: seo.title,
    description: seo.description,
    url: `${seo.baseUrl}/`,
    siteName: seo.siteName,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
  icons: {
    icon: [16, 32, 96, 192].map((s) => ({ url: `/images/dato/favicon-${s}.png`, sizes: `${s}x${s}`, type: "image/png" })),
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seo.siteName,
    alternateName: ["edith studio", "EDITH"],
    description: seo.description,
    url: seo.baseUrl,
    sameAs: socialLinks.map((s) => s.href),
  },
  { "@context": "https://schema.org", "@type": "WebSite", name: seo.siteName, url: seo.baseUrl },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {["funnel-display", "host-grotesk", "roboto-mono"].map((f) => (
          <link key={f} rel="preload" href={`/fonts/${f}-latin.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
        {jsonLd.map((data, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
        ))}
      </head>
      <body>
        <div id="__nuxt">
          <SiteShell>{children}</SiteShell>
        </div>
      </body>
    </html>
  );
}
