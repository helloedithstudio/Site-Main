import type { Metadata } from "next";
import CatalystBrowser from "@/components/catalysts/CatalystBrowser";
import { catalystEntries, catalystsPage } from "@/lib/catalysts";
import { resolvePeople } from "@/lib/github";
import { maintainers } from "@/lib/handbook";
import { seo } from "@/lib/content";
import "@/styles/handbook.css";
import "@/styles/catalysts.css";

export const metadata: Metadata = {
  title: `${catalystsPage.title} | ${seo.siteName}`,
  description: catalystsPage.subtitle,
  alternates: { canonical: "/catalysts" },
  openGraph: {
    type: "website",
    title: `${catalystsPage.title} | ${seo.siteName}`,
    description: catalystsPage.subtitle,
    url: `${seo.baseUrl}/catalysts`,
    siteName: seo.siteName,
  },
};

export default async function CatalystsPage() {
  // Maintainers are Catalysts too; a person listed in both places shows once, with the Maintainer role.
  const people = await resolvePeople([
    ...maintainers.people.map((p) => ({ ...p, role: p.role ?? "Maintainer" })),
    ...catalystEntries.map((p) => ({ ...p, role: p.role ?? "Catalyst" })),
  ]);
  return <CatalystBrowser people={people} />;
}
