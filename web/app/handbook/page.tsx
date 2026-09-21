import type { Metadata } from "next";
import Handbook from "@/components/handbook/Handbook";
import { handbookMeta, maintainers } from "@/lib/handbook";
import { resolvePeople } from "@/lib/github";
import { seo } from "@/lib/content";
import "@/styles/handbook.css";

export const metadata: Metadata = {
  title: `${handbookMeta.title} | ${seo.siteName}`,
  description: handbookMeta.subtitle,
  alternates: { canonical: "/handbook" },
  openGraph: {
    type: "website",
    title: `${handbookMeta.title} | ${seo.siteName}`,
    description: handbookMeta.subtitle,
    url: `${seo.baseUrl}/handbook`,
    siteName: seo.siteName,
  },
};

export default async function HandbookPage() {
  const people = await resolvePeople(maintainers.people);
  return <Handbook people={people} />;
}
