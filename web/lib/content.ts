// Copy for the edith home page. Rich-text strings only use <p>, <span> and <br>, so they need no
// sanitising. Keep the style of the brief: plain words, British spelling, no dashes, no hype.

import { brand } from "./brand";
import { JOIN_HOURS, JOIN_LIVE } from "./join/constants";

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
    "edith is a community that runs itself, for developers and technologists to connect, collaborate, build and launch ideas across Web2, Web3, AI and emerging technology.",
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
        id: "docs",
        title: "Docs",
        links: [
          page("docs#projects", "Top projects"),
          page("docs#discussions", "Discussions"),
          page("docs#faq", "FAQ"),
        ],
      },
    ],
    [
      {
        id: "community",
        title: "Community",
        links: [
          page("legion", "The Legion"),
          external("footer-discord", "Discord", brand.discord),
          external("footer-instagram", "Instagram", brand.instagram),
          external("footer-linkedin", "LinkedIn", brand.linkedin),
        ],
      },
      {
        id: "involved",
        title: "Get involved",
        links: [discord(), page("legion#maintainers", "Become a Maintainer")],
      },
    ],
    [
      {
        id: "trust",
        title: "Trust",
        links: [
          anchor("safety", "Safety"),
          page("docs#rules", "Community rules"),
          page("docs#terms", "Terms of use"),
          page("docs#privacy", "Privacy policy"),
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
        links: [page("docs#clients", "Working with edith"), external("footer-booking", "Book a call", brand.booking)],
      },
      {
        id: "operators",
        title: "For Maintainers",
        links: [page("docs#operating", "Operating under edith")],
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
    page("docs#privacy", "Privacy policy"),
    page("docs#terms", "Terms of use"),
    page("docs#rules", "Community rules"),
    page("docs", "Docs"),
  ],
};

export const whatIs = {
  title: "Why builders<br><span class=\"edith-gradword\">stick around</span>",
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

// The navbar lists the site's separate pages only; the home page sections are reached by scrolling and the quick menu.
export const nav: { label: string; href: string }[] = [
  { label: "The Legion", href: "/legion" },
  { label: "Docs", href: "/docs" },
];

export const home = {
  hero: {
    title: "A legion of builders<br>that runs itself.",
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
      text: `<p>Everyone who joins the server is a Catalyst, with full access to every public channel. Chat, ask, pitch, build and show off.${JOIN_LIVE ? ` On joining you get a short form to complete within ${JOIN_HOURS} hours.` : ""}</p>
<p>Maintainers are the permanent members who keep edith running. It is earned, not bought: 30+ days around, helping people, shipping something and a public profile. Open a PR in ${ch("apply-here")}, get two endorsements and approval from Core, the community's mediators. Maintainers vote on RFCs, lead teams, and can take client work or launch a venture under the edith name.</p>
`,
      links: [discord()],
    },
    stats: [
      { label: "Catalyst", value: "everyone who joins" },
      { label: "Maintainer", value: "earned, not bought" },
    ],
  },
  // "Six hubs, one server", told as one project's story. Second person, present tense, illustrative: nothing here claims a
  // number, a member or an event that has not happened. Each beat lights its hub's layer in the stack image.
  hubs: {
    texts: {
      title: "Every project starts the same way",
      subtitle: "You, an idea, and nobody to tell.",
      text: "<p>Here is what happens next, in the six hubs of one Discord server.</p>",
      closing: `Pick your interests when you join. There is a hangout for everything else, and ${ch("touch-grass")} for when you need it.`,
      links: [discord()],
    },
    cards: [
      {
        id: "ideas",
        hub: "Ideas",
        channels: ["brainstorm"],
        line: "It starts at 11pm, with an idea nobody has heard yet.",
        story: `You have a folder of half-finished projects and no one to say them out loud to. So you say it in ${ch("brainstorm")} before you write a single line, and people who build things tell you what they honestly think.`,
      },
      {
        id: "build",
        hub: "Build",
        channels: ["web2", "web3", "ai"],
        line: "Then you build it, in whatever stack the idea wants.",
        story: `Web2, Web3, AI, hardware, design. Nobody asks you to pick a side or defend your framework. You work in ${ch("web2")}, ${ch("web3")} or ${ch("ai")}, wherever the thing you are making lives.`,
      },
      {
        id: "team-up",
        hub: "Team up",
        channels: ["find-a-team"],
        line: "Somewhere in week two, you realise you need someone else.",
        story: `A designer. A backend brain. A second pair of hands for the weekend. You say what you need in ${ch("find-a-team")}, or you join a hackathon and meet people who are already looking.`,
      },
      {
        id: "help",
        hub: "Help",
        channels: ["rubber-duck"],
        line: "Then you get stuck, because everyone does.",
        story: `You explain the problem out loud in ${ch("rubber-duck")}. Often that is enough. If it is not, someone has probably hit the same wall and can point you the way round. Career questions are welcome too.`,
      },
      {
        id: "feedback",
        hub: "Feedback",
        channels: ["rfcs"],
        line: "And when something about the club is not working, you say so.",
        story: `Request a feature, or write a proposal as an RFC in ${ch("rfcs")}. Maintainers vote on proposals in the open, where everyone can see the result.`,
      },
      {
        id: "show-off",
        hub: "Show off",
        channels: ["ship-it"],
        line: "Then you ship it, and you tell everyone.",
        story: `You post it in ${ch("ship-it")} with a demo and credit the people who helped. Shipped projects get shown live at Demo Day.`,
      },
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
        text: "Maintainers can take on client work under the edith name, on the terms in the docs, and share this site when they pitch.",
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
    // For clients: a 30 minute intro call with edith (Calendly, opens in a new tab).
    booking: external("studio-booking", "Book a 30 minute call", brand.booking),
  },
};
