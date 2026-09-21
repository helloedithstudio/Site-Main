import type { Metadata } from "next";
import Docs from "@/components/docs/Docs";
import { docsMeta } from "@/lib/docs";
import { seo } from "@/lib/content";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: `${docsMeta.title} | ${seo.siteName}`,
  description: docsMeta.subtitle,
  alternates: { canonical: "/docs" },
  openGraph: {
    type: "website",
    title: `${docsMeta.title} | ${seo.siteName}`,
    description: docsMeta.subtitle,
    url: `${seo.baseUrl}/docs`,
    siteName: seo.siteName,
  },
};

export default function DocsPage() {
  return <Docs />;
}
