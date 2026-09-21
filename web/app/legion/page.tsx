import type { Metadata } from "next";
import Legion from "@/components/legion/Legion";
import { catalystEntries, legionPage, maintainerEntries } from "@/lib/legion";
import { resolvePeople } from "@/lib/github";
import { seo } from "@/lib/content";
import "@/styles/docs.css";
import "@/styles/legion.css";

export const metadata: Metadata = {
  title: `${legionPage.eyebrow} | ${seo.siteName}`,
  description: legionPage.subtitle,
  alternates: { canonical: "/legion" },
  openGraph: {
    type: "website",
    title: `${legionPage.eyebrow} | ${seo.siteName}`,
    description: legionPage.subtitle,
    url: `${seo.baseUrl}/legion`,
    siteName: seo.siteName,
  },
};

export default async function LegionPage() {
  // Maintainers are Catalysts too, so one list holds everyone; the page puts Maintainers first.
  const people = await resolvePeople([
    ...maintainerEntries.map((p) => ({ ...p, role: p.role ?? "Maintainer" })),
    ...catalystEntries.map((p) => ({ ...p, role: p.role ?? "Catalyst" })),
  ]);
  return <Legion people={people} />;
}
