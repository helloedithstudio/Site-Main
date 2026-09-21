// The Catalyst directory (/catalysts). Everyone who joins edith is a Catalyst; Maintainers are Catalysts too, so they
// are listed automatically from lib/handbook.ts. Listing is opt-in: only add a person who has asked to be shown.
//
// To add someone, add one line below with their GitHub username. Their name, picture and portfolio link come from
// their GitHub profile at build time (lib/github.ts). All the other fields are optional:
//
//   { github: "octocat", interests: ["Web2", "Design"], note: "Building a CLI for tidy notes.", joined: "2026-09-20" },

import type { PersonEntry } from "./people";

export const catalystEntries: PersonEntry[] = [];

/** The build areas people can filter by (the Build hub: web2, web3, ai, hardware and design). */
export const catalystInterests = ["Web2", "Web3", "AI", "Hardware", "Design"];

export const catalystsPage = {
  eyebrow: "Catalysts",
  title: "Meet the Catalysts",
  subtitle: "Everyone who joins edith starts as a Catalyst. Browse who is building what, and say hello.",
  optIn:
    "Listing is opt-in, so the directory grows as people ask to be added. To be listed, say so in the Discord and share your GitHub username, what you build and a link to your work.",
  short: "That is everyone listed so far. edith is new, and this page fills up as Catalysts choose to be shown.",
  none: "No Catalyst matches that search. Try a different word, or clear the filters.",
};
