// Copy for the edith home page. Rich-text strings only use <p>, <span> and <br>, so they need no
// sanitising. Keep the style of the brief: plain words, British spelling, no dashes, no hype.

import { brand } from "./brand";

export type InternalLink = { id: string; type: string; title: string; slug?: string };
export type LinkItem = { id?: string; label: string; internal?: InternalLink | null; external?: string };
export type ResponsiveImage = {
  srcSet: string;
  webpSrcSet: string;
  sizes: string;
  src: string;
  width: number;
  height: number;
  aspectRatio: number;
  alt: string | null;
  title: string | null;
};
export type MediaItem = { id: string; width: number; height: number; responsiveImage: ResponsiveImage; video: null };

/** A Discord channel name in running text (rendered in the mono font, see styles/edith.css). */
const ch = (name: string) => `<span class="edith-ch">${name}</span>`;

const discord = (label: string = brand.cta): LinkItem => ({ id: `discord-${label}`, label, internal: null, external: brand.discord });
const anchor = (slug: string, label: string): LinkItem => ({
  id: `anchor-${slug}-${label}`,
  label,
  internal: { id: slug, type: "anchor", title: label, slug },
  external: "",
});

/** A link to another page of the site (a path, optionally with a #section). */
const page = (slug: string, label: string): LinkItem => ({
  id: `page-${slug}`,
  label,
  internal: { id: slug, type: "page", title: label, slug },
  external: "",
});

export const seo = {
  siteName: brand.name,
  title: brand.title,
  description: brand.description,
  baseUrl: brand.siteUrl,
} as const;

const external = (id: string, label: string, url: string): LinkItem => ({ id, label, internal: null, external: url });

export type FooterGroup = { id: string; title: string; links: LinkItem[] };

// Apple-style footer: five columns of headed groups, small print above them, legal links below.
export const footer: {
  notes: string[];
  columns: FooterGroup[][];
  legal: LinkItem[];
} = {
  notes: [
    "edith is an autonomous, decentralised organisation for developers and technologists to connect, collaborate, build and launch ideas across Web2, Web3, AI and emerging technology.",
    "There is no token, treasury or on-chain governance, and this site uses no cookies or analytics. Open by default. Reputation is earned.",
  ],
  columns: [
    [
      {
        id: "explore",
        title: "Explore",
        links: [
          anchor("why-edith", "Why edith"),
          anchor("how-it-works", "How it works"),
          anchor("hubs", "Hubs"),
          anchor("membership", "Membership"),
          anchor("show-off", "Show off"),
          anchor("studio", "Studio"),
        ],
      },
      {
        id: "handbook",
        title: "Handbook",
        links: [
          page("handbook#maintainers", "Maintainers"),
          page("handbook#projects", "Top projects"),
          page("handbook#discussions", "Discussions"),
          page("handbook#faq", "FAQ"),
        ],
      },
    ],
    [
      {
        id: "community",
        title: "Community",
        links: [
          external("footer-discord", "Discord", brand.discord),
          external("footer-instagram", "Instagram", brand.instagram),
          external("footer-linkedin", "LinkedIn", brand.linkedin),
        ],
      },
      {
        id: "involved",
        title: "Get involved",
        links: [discord(), page("handbook#maintainers", "Become a Maintainer")],
      },
    ],
    [
      {
        id: "trust",
        title: "Trust",
        links: [
          anchor("safety", "Safety"),
          page("handbook#rules", "Community rules"),
          page("handbook#terms", "Terms of use"),
          page("handbook#privacy", "Privacy policy"),
        ],
      },
      {
        id: "stack",
        title: "Built with",
        links: [
          external("stack-next", "Next.js", "https://www.npmjs.com/package/next"),
          external("stack-three", "Three.js", "https://www.npmjs.com/package/three"),
          external("stack-gsap", "GSAP", "https://www.npmjs.com/package/gsap"),
          external("stack-lenis", "Lenis", "https://www.npmjs.com/package/lenis"),
        ],
      },
    ],
    [
      {
        id: "clients",
        title: "For clients",
        links: [page("handbook#clients", "Working with edith")],
      },
      {
        id: "operators",
        title: "For Maintainers",
        links: [page("handbook#operating", "Operating under edith")],
      },
    ],
    [
      {
        id: "about",
        title: "About edith",
        links: [
          anchor("decisions", "How decisions are made"),
          anchor("beliefs", "What we believe"),
          external("footer-email", "Email us", `mailto:${brand.email}`),
        ],
      },
    ],
  ],
  legal: [
    page("handbook#privacy", "Privacy policy"),
    page("handbook#terms", "Terms of use"),
    page("handbook#rules", "Community rules"),
    page("handbook", "Handbook"),
  ],
};

export const whatIs = {
  title: "Why builders stick around",
  subtitle: "edith gives you four things you cannot get building alone.",
  items: [
    {
      id: "people",
      title: "People to build with",
      text: `Pitch an idea in ${ch("brainstorm")} or say what you need in ${ch("find-a-team")}. Any stack.`,
    },
    {
      id: "feedback",
      title: "Real feedback",
      text: `Show work in progress in ${ch("wip")} and get a straight answer, not a polite one.`,
    },
    {
      id: "unstuck",
      title: "A way to get unstuck",
      text: `Talk it through in ${ch("rubber-duck")}. Someone has hit the same wall.`,
    },
    {
      id: "proof",
      title: "Somewhere to show it",
      text: `Post it in ${ch("ship-it")}, then show it live on Demo Day.`,
    },
  ],
};

export const nav: { label: string; href: string }[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Membership", href: "#membership" },
  { label: "Hubs", href: "#hubs" },
  { label: "Handbook", href: "/handbook" },
];

export const home = {
  hero: {
    title: "A club of builders<br>that runs itself.",
    link: discord(),
  },
  intro: {
    title: "How an idea becomes a launch",
    subtitle: "Pitch it. Find your crew. Build in public. Get unstuck. Ship it. Launch it.",
    slides: [
      { label: "Pitch it", text: `Post the idea in ${ch("brainstorm")} and get real feedback before you write a line.` },
      { label: "Find your crew", text: `Say what you need in ${ch("find-a-team")}. Any stack.` },
      { label: "Build in public", text: `Keep a build log in ${ch("wip")}. A demo beats a deck.` },
      { label: "Get unstuck", text: `Talk it through in ${ch("rubber-duck")}. Someone has hit the same wall.` },
      { label: "Ship it", text: `Put it in ${ch("ship-it")}, then show it live on Demo Day.` },
      { label: "Launch it", text: "The best projects launch under the edith name." },
    ],
  },
  membership: {
    texts: {
      title: "Everyone starts as a Catalyst",
      subtitle: "Do good work and you can open a PR to become a Maintainer.",
      text: `<p>Everyone who joins the server is a Catalyst, with full access to every public channel. Chat, ask, pitch, build and show off.</p>
<p>Maintainers are the permanent members who keep edith running. It is earned, not bought: 30+ days around, helping people, shipping something and a public profile. Open a PR in ${ch("apply-here")}, get two endorsements and Core approval. Maintainers vote on RFCs, lead teams, and can take client work or launch a venture under the edith name.</p>
`,
      links: [discord()],
    },
    stats: [
      { label: "Catalyst", value: "everyone who joins" },
      { label: "Maintainer", value: "earned, not bought" },
    ],
  },
  hubs: {
    texts: {
      title: "Six hubs, one server",
      subtitle: "Everything lives in Discord, sorted by what you came to do.",
      text: `<p>Pick your interests when you join. There is a hangout for everything else, and ${ch("touch-grass")} for when you need it.</p>`,
      links: [discord()],
    },
    cards: [
      { id: "ideas", hub: "Ideas", what: "Pitch an idea and get real feedback.", channels: ["brainstorm"] },
      { id: "build", hub: "Build", what: "Web2, Web3, AI, hardware and design.", channels: ["web2", "web3", "ai"] },
      { id: "team-up", hub: "Team up", what: "Find a crew and join hackathons.", channels: ["find-a-team"] },
      { id: "help", hub: "Help", what: "Get unstuck, ask, talk careers.", channels: ["rubber-duck"] },
      { id: "feedback", hub: "Feedback", what: "Request features and propose RFCs.", channels: ["rfcs"] },
      { id: "show-off", hub: "Show off", what: "Share what you shipped.", channels: ["ship-it"] },
    ],
  },
  safety: {
    title: `Moderated. <span class="whitespace-nowrap">Scam-free.</span>`,
    subtitle:
      "Everyone passes rules screening on the way in, and AutoMod blocks spam, scams, invite links and mention raids.",
    text: "<span>Nobody from edith will ever DM you asking for keys or payments. If someone does, it is not us.</span>",
    rules: [
      "Moderated",
      "Rules screening",
      "AutoMod on",
      "No scams",
      "No invite spam",
      "No mention raids",
      "No DMs for keys or payments",
    ],
  },
  beliefs: {
    items: [
      {
        id: "autonomous",
        text: "<span>Autonomous. Nobody hands out work. Members pitch ideas, form their own teams and ship on their own terms.</span>",
      },
      {
        id: "decentralised",
        text: "<span>Decentralised. The community decides. Anyone can suggest, Maintainers vote and Core carries out the result.</span>",
      },
      {
        id: "builder-first",
        text: "<span>Builder-first. Shipping beats talking, a demo beats a deck, and we build in public.</span>",
      },
      {
        id: "stack-agnostic",
        text: "<span>Stack-agnostic. Pick the right tool for the problem, not the hype.</span>",
      },
      {
        id: "open",
        text: "<span>Open by default. Ideas get better in public, and we credit the people who helped.</span>",
      },
      {
        id: "earned",
        text: "<span>Reputation is earned. Membership comes from what you build and who you help, not follower counts.</span>",
      },
    ],
  },
  decisions: {
    texts: {
      title: "The community decides",
      subtitle: "Anyone can suggest. Maintainers vote on RFCs. Core carries out the result.",
      text: "<p>This is a governance culture, not a blockchain. There is no token and nothing on-chain.</p>",
      links: [] as LinkItem[],
    },
    list: [
      {
        id: "suggest",
        title: "Anyone suggests",
        text: "\n<span>Open a feature request. Every member can, whatever their role.</span>\n",
      },
      {
        id: "vote",
        title: "Maintainers vote",
        text: `
<span>Formal proposals go to ${ch("rfcs")}, where Maintainers vote in the open.</span>
`,
      },
      {
        id: "carry",
        title: "Core carries it out",
        text: "\n<span>Once the vote is done, Core turns the result into action.</span>\n",
      },
    ],
  },
  showOff: {
    title: "Shipped by members",
    subtitle: `Built something? Post it in ${ch("ship-it")}. The first projects land here soon.`,
    cards: [
      {
        id: "yours",
        tag: "Ship-it",
        title: "Your project here",
        text: `Post it in ${ch("ship-it")} with a demo and credit the people who helped.`,
        link: discord(),
      },
      {
        id: "demo-day",
        tag: "Demo Day",
        title: "Show it live",
        text: "A monthly stage session where shipped projects get shown live. The first date is yet to be announced.",
        link: discord(),
      },
      {
        id: "launches",
        tag: "Launches",
        title: "Launch it",
        text: "The strongest projects launch under the edith name.",
        link: discord(),
      },
    ],
  },
  franchise: {
    texts: {
      title: "Build under the edith name",
      subtitle:
        "Join as a Catalyst, earn Maintainer, then take client work or launch a venture under edith. The founder approves each venture.",
      text: "",
      links: [discord()],
    },
    items: [
      {
        id: "catalyst",
        title: "Become a Catalyst",
        text: "Join the Discord, pick your interests and start pitching, building and shipping.",
        link: discord(),
        linkLabel: "Become a Catalyst",
      },
      {
        id: "freelance",
        title: "Freelance under edith",
        text: "Maintainers can take on client work under the edith name and share this site when they pitch.",
        link: anchor("membership", "How Maintainers work"),
        linkLabel: "How Maintainers work",
      },
      {
        id: "launch",
        title: "Launch under edith",
        text: "Maintainers can ask the founder for approval to run a startup under the edith name.",
        link: anchor("membership", "Become a Maintainer"),
        linkLabel: "Become a Maintainer",
      },
    ],
  },
};
