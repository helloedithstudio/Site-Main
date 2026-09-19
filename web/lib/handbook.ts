// Content of the handbook page (/handbook): the club (maintainers, projects, discussions, FAQ) and the
// rules and legal documents. Plain strings only; `backticks` mark a Discord channel name. British spelling,
// no dashes. The legal text is a DRAFT written for edith and has not been reviewed by a lawyer.

import { brand } from "./brand";

export type Clause = { title: string; body: string[] };

export type LegalDoc = {
  id: string;
  label: string;
  title: string;
  summary: string;
  clauses: Clause[];
};

export const handbookMeta = {
  title: "The edith handbook",
  subtitle: "Who runs edith, what members have shipped, how to get involved, and the rules and terms that keep it fair.",
  updated: "20 September 2026",
  draftNotice:
    "The rules and legal documents below are a draft. They were written for edith and have not yet been reviewed by a lawyer. Until they are, read them as a statement of how edith intends to work, not as legal advice.",
};

export const maintainers = {
  id: "maintainers",
  label: "Maintainers",
  status: "Currently brewing",
  title: "Who keeps edith running",
  intro:
    "edith is new, so the Maintainer roster is short on purpose. Maintainers are earned, not appointed in bulk. Right now there is one.",
  founder: {
    name: brand.founder,
    role: "Founder",
    place: brand.location,
    note: "Approves every venture that runs under the edith name.",
  },
  openSeat: {
    title: "Open seat",
    text: "Could be you. Help people, ship something, then open a PR in `apply-here`.",
  },
  seats: 3,
  path: "Becoming a Maintainer takes 30+ days around, helping people, shipping something and a public profile. Open a PR in `apply-here`, get two endorsements and Core approval. You hear back in about a week.",
};

export const projects = {
  id: "projects",
  label: "Top projects",
  status: "Nothing here yet",
  title: "What members have shipped",
  intro:
    "The first projects will be listed here once they ship. Every project credits the people who helped build it, and the strongest launch under the edith name.",
  empty: {
    title: "Your project here",
    text: "Post it in `ship-it` with a demo and credit the people who helped.",
  },
  slots: 3,
  demoDay: "Demo Day is a monthly stage session where shipped projects get shown live. The first date is yet to be announced.",
};

export const discussions = {
  id: "discussions",
  label: "Discussions",
  title: "Where the conversation happens",
  intro: "Everything lives in Discord, sorted by what you came to do. These are the places to start.",
  channels: [
    { channel: "brainstorm", hub: "Ideas", text: "Pitch an idea and get real feedback before you write a line." },
    { channel: "find-a-team", hub: "Team up", text: "Say what you need and find a crew. Any stack." },
    { channel: "wip", hub: "Build", text: "Keep a build log. A demo beats a deck." },
    { channel: "rubber-duck", hub: "Help", text: "Talk it through. Someone has hit the same wall." },
    { channel: "rfcs", hub: "Feedback", text: "Formal proposals, where Maintainers vote in the open." },
    { channel: "ship-it", hub: "Show off", text: "Share what you shipped, with credit for the people who helped." },
    { channel: "apply-here", hub: "Membership", text: "Open a PR to become a Maintainer." },
    { channel: "touch-grass", hub: "Hangout", text: "For when you need a break from building." },
  ],
  rfcs: "Open RFCs: none yet. Formal proposals go to `rfcs`, where Maintainers vote and Core carries out the result.",
};

export const faq = {
  id: "faq",
  label: "FAQ",
  title: "Frequently asked questions",
  items: [
    {
      q: "Who is edith for?",
      a: "Developers, designers and technologists of any level: students, professionals, founders and freelancers. Web2, Web3, AI and everything else. It is stack-agnostic on purpose.",
    },
    {
      q: "What is a Catalyst?",
      a: "Everyone who joins the server. Catalysts have full access to every public channel: chat, ask, pitch, build and show off.",
    },
    {
      q: "How do I become a Maintainer?",
      a: "After 30+ days of helping people, shipping something and having a public profile, open a PR in `apply-here`. Maintainers review it in the open, two endorse it and Core approves. You hear back in about a week.",
    },
    {
      q: "What can Maintainers do?",
      a: "Maintainers are the permanent members who keep edith running. They vote on RFCs, lead teams, and can take client work or launch a venture under the edith name.",
    },
    {
      q: "How are decisions made?",
      a: "Anyone can suggest by opening a feature request. Formal proposals go to `rfcs`, where Maintainers vote in the open. Core then carries out the result.",
    },
    {
      q: "Is there a token, a DAO or anything on-chain?",
      a: "No. There is no token, treasury or on-chain governance. Decisions are made by people in the community, in the open.",
    },
    {
      q: "Will anyone from edith DM me?",
      a: "Not to ask for keys or payments, ever. If someone claims to be from edith and asks, it is not us.",
    },
    {
      q: "Can I run my startup under edith?",
      a: "Maintainers can. Ask the founder in the private Maintainers channel. If it is approved, you can say you operate under edith on your own site. The terms are in Operating under edith below.",
    },
    {
      q: "Can I hire someone through edith?",
      a: "Maintainers can take client work under the edith name. The Maintainer who pitched to you is your main contact and the meeting you book is with them. The terms are in Working with edith below.",
    },
    {
      q: "What happens on Demo Day?",
      a: "It is a monthly stage session where shipped projects get shown live. The first date is yet to be announced.",
    },
    {
      q: "Where is edith based?",
      a: `edith is run from ${brand.location}. The community is online and open to anyone.`,
    },
  ],
};

const contact = `Questions about this document can be sent to ${brand.email}.`;
const law =
  "These terms are governed by the laws of India. If a disagreement cannot be settled by talking it through in good faith for 30 days, it goes to arbitration under the Arbitration and Conciliation Act, 1996, before a sole arbitrator, seated in Chennai and conducted in English. Subject to that, the courts at Chennai, Tamil Nadu have exclusive jurisdiction.";

export const rules: LegalDoc = {
  id: "rules",
  label: "Community rules",
  title: "Community rules",
  summary: "Be good to people, credit the people who helped, and never scam anyone.",
  clauses: [
    {
      title: "Be decent",
      body: [
        "Treat people with respect. Disagree with ideas, not with people. No harassment, hate, threats or sharing of other people's private details.",
      ],
    },
    {
      title: "Build in the open and credit people",
      body: [
        "Share real work, ask for feedback plainly and give straight answers kindly. When someone helped you, say so.",
      ],
    },
    {
      title: "No scams",
      body: [
        "No phishing, fake giveaways, pump schemes or anything that asks people for keys, seed phrases or payments. Nobody from edith will DM you for keys or payments. If someone does, it is not us, so report them.",
      ],
    },
    {
      title: "No spam and no raids",
      body: [
        "No invite links, mass mentions, repeated adverts or unsolicited DMs to promote something. AutoMod blocks spam, scams, invite links and mention raids automatically.",
      ],
    },
    {
      title: "Keep it legal",
      body: [
        "Do not share pirated software, malware, stolen data or anything that breaks someone else's rights or the law of India. If you are not sure whether you can post something, ask a moderator first.",
      ],
    },
    {
      title: "Use the right place",
      body: [
        "Pitches go in `brainstorm`, teams in `find-a-team`, work in progress in `wip`, finished projects in `ship-it`, and proposals in `rfcs`. It keeps the server useful for everyone.",
      ],
    },
    {
      title: "If a rule is broken",
      body: [
        "Everyone passes rules screening on the way in. AutoMod may act on its own. Moderators can delete a message, warn, mute, remove or ban, depending on how serious it is. Serious cases go to Core. You can appeal by messaging a Core member, and Core's decision is final, subject to the law.",
        "To report a problem, message a moderator or a Core member.",
      ],
    },
  ],
};

export const terms: LegalDoc = {
  id: "terms",
  label: "Terms of use",
  title: "Terms of use",
  summary: "How you may use the edith website and community.",
  clauses: [
    {
      title: "About these terms",
      body: [
        "These terms apply to the edith website and to the edith community on Discord (together, edith). By using either, you agree to them. If you do not agree, please do not use edith.",
        `edith is run from ${brand.location} by its founder, ${brand.founder}. The details of the legal entity will be added here once they are confirmed.`,
      ],
    },
    {
      title: "Who can take part",
      body: [
        "You must be 18 or older. Give accurate information, keep your Discord account secure and remember you are responsible for what you post. Discord's own terms and guidelines also apply to you.",
      ],
    },
    {
      title: "Roles",
      body: [
        "Everyone who joins is a Catalyst. Maintainers are members who earned the role, and Core carries out community decisions. Roles do not make anyone an employee, partner or agent of edith or of each other.",
      ],
    },
    {
      title: "Your content and your work",
      body: [
        "You keep ownership of what you make and post. You give edith a non-exclusive, worldwide, royalty-free licence to display what you post publicly (for example a project shared in `ship-it`) to run and promote the community, and to credit you when we do.",
        "If you build with others, agree who owns what between yourselves, ideally in writing. edith does not claim ownership of member projects.",
      ],
    },
    {
      title: "The edith name",
      body: [
        "The edith name, logo and the design of this site belong to edith. Do not use them in a way that suggests you are edith or that edith endorses you. Only a Maintainer approved under Operating under edith may say they operate under the edith name.",
      ],
    },
    {
      title: "Acceptable use",
      body: [
        "Follow the Community rules. Do not use the website or the community unlawfully, attack or overload the website, scrape it in bulk, or pretend to be edith or its people.",
      ],
    },
    {
      title: "No tokens, no money, no investment advice",
      body: [
        "edith has no token, treasury or on-chain governance, and does not take deposits or investments. Nothing on the website or in the community is an offer of securities or financial, legal or tax advice. Nobody from edith will ask you for keys or payments over DM.",
      ],
    },
    {
      title: "Other services",
      body: [
        "edith relies on other services such as Discord and Google Fonts, and links to other sites. They have their own terms and privacy practices, and edith is not responsible for them.",
      ],
    },
    {
      title: "Availability and changes",
      body: [
        "We try to keep edith running but cannot promise it will always be available or free of errors. We may change, pause or end any part of it.",
      ],
    },
    {
      title: "No guarantees",
      body: [
        "edith is provided as it is. Advice and feedback from members is their own opinion, and edith does not guarantee any result from taking part.",
      ],
    },
    {
      title: "Limit of liability",
      body: [
        "To the extent the law allows, edith and its founder are not liable for indirect or consequential loss, or for loss of profit or data. Our total liability for any claim is limited to the amount you paid to edith for the thing the claim is about, which for the free community is nothing. Nothing in these terms limits any liability that the law does not allow to be limited.",
      ],
    },
    {
      title: "Leaving and removal",
      body: [
        "You can leave at any time. We can warn, mute, remove or ban you if you break the Community rules or these terms.",
      ],
    },
    {
      title: "Changes to these terms",
      body: [
        "We may update these terms. The date at the top of this page shows the latest version. If you keep using edith after a change, you accept the new version.",
      ],
    },
    { title: "Governing law and disputes", body: [law] },
    { title: "Contact", body: [contact] },
  ],
};

export const privacy: LegalDoc = {
  id: "privacy",
  label: "Privacy policy",
  title: "Privacy policy",
  summary: "What personal data edith handles, why, and the rights you have over it.",
  clauses: [
    {
      title: "Who is responsible",
      body: [
        `edith, run from ${brand.location} by ${brand.founder}, decides why and how your personal data is used (in the language of the Digital Personal Data Protection Act, 2023, the Data Fiduciary). This policy follows that Act, the Information Technology Act, 2000 and the rules made under it.`,
        `For any privacy question or complaint, contact ${brand.founder} at ${brand.email}.`,
      ],
    },
    {
      title: "This website",
      body: [
        "The website does not use cookies, advertising or analytics tools, and it does not ask you to create an account or fill in a form. Our hosting provider may keep standard server logs, such as your IP address, the time and the page requested, to keep the site secure and running.",
        "The site loads fonts from Google Fonts, so your browser contacts Google's servers when you visit. The Discord button takes you to Discord, which has its own privacy policy.",
      ],
    },
    {
      title: "The Discord community",
      body: [
        "When you join the server, Discord shares your username, user ID, roles, join date and what you post with us and with other members. Messages in public channels are visible to everyone in the server, so post accordingly.",
        "Moderators and AutoMod may process your messages to remove spam, scams and rule breaking.",
      ],
    },
    {
      title: "If you contact us or work with edith",
      body: [
        "If you apply to be a Maintainer, ask to work under the edith name, or contact us or a Maintainer about a project, we use the details you send us (such as your name, links and email) to reply, assess your request and carry out the work.",
      ],
    },
    {
      title: "Why we use your data",
      body: [
        "We use it to run and moderate the community, keep it safe, deal with applications and enquiries, and meet our legal duties. We rely on your consent, given by joining and posting or by getting in touch, and on other uses that the law allows, such as complying with a legal obligation. You can withdraw consent at any time, which may mean you can no longer take part.",
      ],
    },
    {
      title: "Who we share it with",
      body: [
        "Only with the services that help us run edith (such as Discord and our hosting provider), with Maintainers who work with you on something you asked for, and with authorities when the law requires. We do not sell personal data.",
      ],
    },
    {
      title: "Where it is stored",
      body: [
        "Discord and other providers may store data outside India. We only use providers that we reasonably believe protect it, and we follow any restriction the Government of India places on transfers to particular countries.",
      ],
    },
    {
      title: "How long we keep it",
      body: [
        "Messages stay until you, a moderator or Discord deletes them. Details you send us are kept only as long as needed for the reason you sent them, or as the law requires.",
      ],
    },
    {
      title: "Your rights",
      body: [
        "You can ask us for a summary of the personal data we hold about you and how it is used, ask us to correct, complete or update it, and ask us to erase it. You can also nominate someone to exercise these rights for you if you die or cannot act, and you can make a complaint about how your data is handled.",
        `Email ${brand.email}. We aim to reply within 30 days. If we have not resolved your complaint, you may complain to the Data Protection Board of India once it is in operation.`,
      ],
    },
    {
      title: "Security",
      body: [
        "We use reasonable safeguards, but no system is perfectly secure. If a breach affects your personal data, we will tell you and the authorities as the law requires.",
      ],
    },
    {
      title: "Age",
      body: [
        "edith is for people aged 18 or over. We do not knowingly handle the personal data of children, and we will remove it if we learn that we do.",
      ],
    },
    {
      title: "Changes",
      body: [
        "If we change how we handle data, for example by adding analytics to the website, we will update this policy first and change the date at the top of the page.",
      ],
    },
  ],
};

export const clients: LegalDoc = {
  id: "clients",
  label: "Working with edith",
  title: "Working with edith",
  summary: "For customers. Terms for a project that a Maintainer takes on under the edith name.",
  clauses: [
    {
      title: "How these terms fit",
      body: [
        "These terms sit alongside the written quote or agreement for your project. If the two disagree, the written agreement for your project wins.",
      ],
    },
    {
      title: "Who you work with",
      body: [
        "The Maintainer who pitched to you leads your project and is your main contact. The meeting you book through this site is with that Maintainer, who may bring in others to help. The founder oversees work done under the edith name and may join where needed.",
      ],
    },
    {
      title: "Scope, price and timeline",
      body: [
        "These are agreed in writing before work starts, and any change is agreed in writing too. Prices are shown before tax. GST and other taxes are added where the law requires them.",
      ],
    },
    {
      title: "Payment",
      body: ["You pay as set out in the quote. If a payment is late, the work may be paused until it is received."],
    },
    {
      title: "What we need from you",
      body: [
        "Give the content, access and feedback you agreed to, on time. You confirm that you own, or are allowed to use, anything you give us.",
      ],
    },
    {
      title: "Who owns the work",
      body: [
        "When you have paid in full, you own the final deliverables made for you. Third-party and open-source parts stay under their own licences, and the Maintainer keeps their own tools and know-how, which you may use as part of the deliverables. Until payment in full, the work remains the Maintainer's.",
        "The Maintainer and edith may show the finished work in their portfolio unless you tell them in writing, before work starts, that it must stay private.",
      ],
    },
    {
      title: "Confidentiality",
      body: [
        "Each side keeps the other's non-public information confidential, and shares it only with people who need it for the project or where the law requires.",
      ],
    },
    {
      title: "Care, not guarantees",
      body: [
        "The work is done with reasonable skill and care. We do not guarantee particular business results, and we are not responsible for third-party services outside our control.",
      ],
    },
    {
      title: "Limit of liability",
      body: [
        "Our total liability for any claim is limited to the fees you paid for the work the claim is about, and we are not liable for indirect or consequential loss. Nothing here limits any liability that the law does not allow to be limited.",
      ],
    },
    {
      title: "Ending a project",
      body: ["Either side can end a project with written notice. You pay for the work done up to that point."],
    },
    { title: "Governing law and disputes", body: [law] },
    { title: "Contact", body: [contact] },
  ],
};

export const operating: LegalDoc = {
  id: "operating",
  label: "Operating under edith",
  title: "Operating under edith",
  summary: "For Maintainers. The terms for working or launching a venture under the edith name.",
  clauses: [
    {
      title: "Who can ask",
      body: [
        "A Maintainer in good standing can ask the founder, in the private Maintainers channel, for approval to work or launch a venture under the edith name. The founder decides each request separately and may say no.",
      ],
    },
    {
      title: "What approval gives you",
      body: [
        "A personal, non-exclusive, non-transferable licence, which the founder can revoke, to say that your venture or work operates under edith, in the way agreed when you were approved (the wording, where you use it and whether you may use the logo). Nothing more.",
      ],
    },
    {
      title: "What it does not give you",
      body: [
        "You have no authority to sign contracts for edith or bind it. You are not an employee, partner or agent of edith. You may not give anyone else permission to use the name, or use it for anything else.",
      ],
    },
    {
      title: "You are independent",
      body: [
        "You run your own venture and work. You are responsible for your own contracts, customers, taxes (including GST registration where it is required), insurance and legal compliance. Do not present edith as responsible for your work.",
      ],
    },
    {
      title: "Standards",
      body: [
        "Work honestly. Be straight with customers about scope, price and timing. Follow the Community rules and these terms. Do not make misleading claims about customers, results or your team, and credit the people who help you.",
      ],
    },
    {
      title: "Customer introductions and meetings",
      body: [
        "You may share the edith site when you pitch. A meeting a customer books through the site goes to the Maintainer who pitched to them. That Maintainer runs the meeting and may add others. Work for a customer is subject to Working with edith.",
      ],
    },
    {
      title: "Money",
      body: [
        "Any fee or revenue share between you and edith is agreed in writing with the founder before you start using the name. None is assumed.",
      ],
    },
    {
      title: "Ownership",
      body: [
        "You own your venture and the work you make. edith owns its name, logo and site, and any goodwill built up by using the name belongs to edith.",
      ],
    },
    {
      title: "Ending",
      body: [
        "Either side can end the arrangement with written notice. The founder can end it straight away for a serious breach, such as misleading customers, unlawful conduct or harm to edith. When it ends, stop using the name and remove references to edith from your site and materials within 14 days, or straight away if it ended for a serious breach. Contracts you already signed with customers continue between you and them, and you must not present them as edith's.",
      ],
    },
    {
      title: "Compensation",
      body: [
        "You will compensate edith and its founder for any claim, loss or cost that arises from your work or from your breaking these terms.",
      ],
    },
    { title: "Governing law and disputes", body: [law] },
    { title: "Contact", body: [contact] },
  ],
};

export const legalDocs: LegalDoc[] = [rules, terms, privacy, clients, operating];

/** Sticky navigation: club sections first, then rules and legal documents. */
export const handbookNav = [
  { group: "The club", items: [maintainers, projects, discussions, faq].map((s) => ({ id: s.id, label: s.label })) },
  { group: "Rules and legal", items: legalDocs.map((d) => ({ id: d.id, label: d.label })) },
];
