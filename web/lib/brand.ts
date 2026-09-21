// One place for the brand strings and outbound links. A rename or a new link is a one-line change here.

export const brand = {
  name: "edith",
  tagline: "A club of builders that runs itself.",
  title: "edith | A club of builders that runs itself",
  description:
    "edith is where developers and technologists across Web2, Web3, AI and whatever comes next connect, collaborate, build and launch.",
  cta: "Become a Catalyst",
  // NEXT_PUBLIC_SITE_URL wins. On Vercel the production domain is provided at build time, so canonical, sitemap and social
  // URLs are right without setting anything; locally it is localhost.
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  discord: "https://discord.gg/TmVeNgzw4K",
  // Book a call with edith (Calendly). Opens in a new tab; nothing is embedded, so no third party loads until it is clicked.
  booking: "https://calendly.com/hello-edithstudio/30min",
  // Used on the docs page and in the legal text. Taken from the previous edith studio repo; confirm before launch.
  instagram: "https://www.instagram.com/edith_.studio/",
  linkedin: "https://www.linkedin.com/in/edith-studio/",
  email: "hello.edithstudio@gmail.com",
  founder: "Kevin Andrew",
  location: "India",
} as const;

// Socials shown in the header menu, mobile menu and footer. An entry with an empty `href` is hidden, so X can
// be added here (with its icon in components/ui/Social.tsx) once its URL exists.
export type SocialLink = { id: "discord" | "instagram" | "linkedin"; label: string; href: string };

const candidates: SocialLink[] = [
  { id: "discord", label: "Discord", href: brand.discord },
  { id: "instagram", label: "Instagram", href: brand.instagram },
  { id: "linkedin", label: "LinkedIn", href: brand.linkedin },
];

export const socialLinks: SocialLink[] = candidates.filter((s) => !!s.href);
