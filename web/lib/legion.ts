// The Legion page (/legion): every person on the site in one directory. Maintainers and Catalysts are listed together,
// Maintainers first, and the page also explains how to earn a Maintainer seat. Everyone who joins edith is a Catalyst.
//
// To add someone, add one line below with their GitHub username. Their name, picture and portfolio link come from
// their GitHub profile at build time (lib/github.ts). Everything else is optional, and anything written here wins over
// what GitHub says. Listing is opt-in: only add a person who has asked to be shown.
//
//   Maintainer: { github: "octocat", role: "Maintainer", discord: "octo_cat", note: "Runs the design hub." },
//   Catalyst:   { github: "octocat", interests: ["Web2", "Design"], note: "Building a CLI for tidy notes.", joined: "2026-09-20" },

import { brand } from "./brand";
import type { PersonEntry } from "./people";

/** Maintainers (and the Origin). The role defaults to "Maintainer". */
export const maintainerEntries: PersonEntry[] = [
  {
    github: "Andrew-Kevin-007",
    name: brand.founder,
    portfolio: "https://kevinandrew.tech/",
    discord: "beyond.aphelion_",
    role: "Origin",
    note: "Approves every venture that runs under the edith name.",
  },
];

/** Catalysts who asked to be listed. The role defaults to "Catalyst". */
export const catalystEntries: PersonEntry[] = [];

/** The build areas people can filter by (the Build hub: web2, web3, ai, hardware and design). */
export const legionInterests = ["Web2", "Web3", "AI", "Hardware", "Design"];

export const legionPage = {
  eyebrow: "The Legion",
  title: "Meet the Legion",
  subtitle:
    "Everyone who joins edith starts as a Catalyst, and Maintainers are the ones who earned a seat. Browse who is building what, and say hello.",
  optIn:
    "Listing is opt-in, so the directory grows as people ask to be added. To be listed, say so in the Discord and share your GitHub username, what you build and a link to your work.",
  short: "That is everyone listed so far. edith is new, and this page fills up as people choose to be shown.",
  none: "Nobody matches that search. Try a different word, or clear the filters.",
  seats: {
    id: "maintainers",
    status: "Currently brewing",
    title: "Earn a Maintainer seat",
    intro:
      "edith is new, so the Maintainer roster is short on purpose. Maintainers are earned, not appointed in bulk. Right now there is one.",
    open: 3,
    openTitle: "Open seat",
    openText: "Could be you. Help people, ship something, then open a PR in `apply-here`.",
    path: "Becoming a Maintainer takes 30+ days around, helping people, shipping something and a public profile. Open a PR in `apply-here`, get two endorsements and Core approval. You hear back in about a week.",
  },
};
