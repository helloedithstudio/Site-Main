import type { Metadata } from "next";
import Legion from "@/components/legion/Legion";
import { catalystEntries, legionPage, maintainerEntries } from "@/lib/legion";
import { readDirectory, storeCredsFromEnv } from "@/lib/legion/directory";
import { resolvePeople } from "@/lib/github";
import { seo } from "@/lib/content";
import type { PersonEntry } from "@/lib/people";
import "@/styles/docs.css";
import "@/styles/legion.css";

// Freshly rendered on every visit: new Catalysts are added to the directory the moment their form is submitted, and
// people expect to see themselves right away. GitHub's own profile lookups still cache for a day (lib/github.ts), so
// this does not add extra load on GitHub's API, only on our own database.
export const dynamic = "force-dynamic";

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
  const creds = storeCredsFromEnv();
  const fromDirectory = creds ? await readDirectory(creds) : [];
  // The hand-written list stays as a fallback and for anyone added before this existed. If someone appears in both
  // (they filled the form again), the fresher directory entry wins.
  const byLogin = new Map<string, PersonEntry>();
  for (const e of [...catalystEntries, ...fromDirectory]) byLogin.set(e.github.toLowerCase(), e);

  // Maintainers are Catalysts too, so one list holds everyone; the page puts Maintainers first.
  const people = await resolvePeople([
    ...maintainerEntries.map((p) => ({ ...p, role: p.role ?? "Maintainer" })),
    ...[...byLogin.values()].map((p) => ({ ...p, role: p.role ?? "Catalyst" })),
  ]);
  return <Legion people={people} />;
}
