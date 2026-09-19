import type { Metadata, Viewport } from "next";
import { seo } from "@/lib/content";
import { socialLinks } from "@/lib/brand";
import SiteShell from "@/components/SiteShell";
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
    locale: "en_US",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Host+Grotesk:ital,wght@0,300..800;1,300..800&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap"
        />
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
