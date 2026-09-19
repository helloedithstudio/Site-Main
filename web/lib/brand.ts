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
  // Used on the handbook page and in the legal text. Taken from the previous edith studio repo; confirm before launch.
  instagram: "https://www.instagram.com/edith_.studio/",
  linkedin: "https://www.linkedin.com/in/edith-studio/",
  email: "hello.edithstudio@gmail.com",
  founder: "Kevin Andrew",
  location: "Chennai, India",
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
