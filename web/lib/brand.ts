// One place for the brand strings and outbound links. A rename or a new link is a one-line change here.

export const brand = {
  name: "edith",
  tagline: "A club of builders that runs itself.",
  title: "edith | A club of builders that runs itself",
  description:
    "edith is where developers and technologists across Web2, Web3, AI and whatever comes next connect, collaborate, build and launch.",
  cta: "Become a Catalyst",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  discord: "https://discord.gg/TmVeNgzw4K",
} as const;

// Socials shown in the header menu, mobile menu and footer. An entry with an empty `href` is hidden,
// so Instagram, LinkedIn and X can be added here (with their icon in components/ui/Social.tsx) once
// the URLs are confirmed.
export type SocialLink = { id: "discord"; label: string; href: string };

const candidates: SocialLink[] = [{ id: "discord", label: "Discord", href: brand.discord }];

export const socialLinks: SocialLink[] = candidates.filter((s) => !!s.href);
