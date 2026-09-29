import type { Metadata } from "next";
import Showcase from "@/components/showcase/Showcase";
import type { BuildFactsView, ExhibitView } from "@/components/showcase/types";
import { exhibitAuthors, exhibits, orderExhibits, reservedSlots, showcaseMedia, showcasePage, validateExhibits } from "@/lib/showcase";
import build from "@/lib/showcase.build.json";
import { maintainerEntries } from "@/lib/legion";
import { resolvePeople } from "@/lib/github";
import { seo } from "@/lib/content";
import type { Person } from "@/lib/people";
import "@/styles/showcase.css";

// Static, refreshed daily (the builders' names and pictures come from GitHub, which the page caches for a day).
export const revalidate = 86400;

const title = `${showcasePage.eyebrow} | ${seo.siteName}`;
const description = `${showcasePage.title} ${showcasePage.subtitle}`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/studio" },
  openGraph: { type: "website", title, description, url: `${seo.baseUrl}/studio`, siteName: seo.siteName },
  twitter: { card: "summary_large_image", title, description },
};

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function buildFacts(): BuildFactsView {
  const facts: BuildFactsView = [];
  if (build.git) {
    facts.push({ label: "Commits", value: String(build.git.commits) });
    facts.push({ label: "First commit", value: day(build.git.firstCommit) });
    facts.push({ label: "Latest commit", value: day(build.git.lastCommit) });
  }
  facts.push({ label: "Models made in Blender", value: String(build.webgl.blenderModels) });
  facts.push({ label: "WebGL assets", value: `${(build.webgl.bytes / 1_000_000).toFixed(1)} MB` });
  // Only real renders count; stand-in frames never do.
  if (!showcaseMedia.placeholder) {
    const frames = Object.values(showcaseMedia.films).reduce((n, f) => n + Object.values(f.variants).reduce((m, v) => m + v.count, 0), 0);
    facts.push({ label: "Rendered film frames on this page", value: frames.toLocaleString("en-GB") });
  }
  facts.push({ label: "Automated checks on the join flow", value: String(build.join.checks) });
  return facts;
}

export default async function ShowcasePage() {
  const problems = validateExhibits(exhibits);
  if (problems.length) throw new Error(`The Showcase exhibits in lib/showcase.ts need fixing:\n${problems.join("\n")}`);
  const ordered = orderExhibits(exhibits);

  // Maintainers first, so the names written in lib/legion.ts win over GitHub's for anyone who is both.
  const people = await resolvePeople([
    ...maintainerEntries.map((p) => ({ ...p, role: p.role ?? "Maintainer" })),
    ...exhibitAuthors(ordered).map((github) => ({ github })),
  ]);
  const byLogin = new Map<string, Person>(people.map((p) => [p.login.toLowerCase(), p]));
  const maintainerLogins = new Set(maintainerEntries.map((m) => m.github.toLowerCase()));

  const views: ExhibitView[] = ordered.map((e) => {
    const ex = e.closer.excerpt ? build.excerpts[e.closer.excerpt.key] : undefined;
    return {
      ...e,
      authors: e.authors.map((a) => byLogin.get(a.toLowerCase())).filter((p): p is Person => !!p),
      closer: {
        brief: e.closer.brief,
        built: e.closer.built,
        shipped: e.closer.shipped,
        excerpt: ex && e.closer.excerpt ? { caption: e.closer.excerpt.caption, code: ex.code, file: ex.file, startLine: ex.startLine, endLine: ex.endLine } : undefined,
      },
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${seo.siteName} studio`,
    itemListElement: views.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: e.title,
        description: e.summary,
        url: e.url.startsWith("/") ? `${seo.baseUrl}${e.url}` : e.url,
        dateCreated: e.shipped,
        creator: e.authors.map((p) => ({ "@type": "Person", name: p.name, url: p.github })),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Showcase
        exhibits={views}
        reserved={reservedSlots}
        maintainers={people.filter((p) => maintainerLogins.has(p.login.toLowerCase()))}
        facts={buildFacts()}
      />
    </>
  );
}
