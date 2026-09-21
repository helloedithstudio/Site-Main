// People shown on the site (Maintainers on the handbook, everyone on /catalysts). An entry only needs a GitHub username:
// the name, picture and portfolio link are read from that GitHub profile when the site is built (see lib/github.ts), and
// any field written here wins over what GitHub says.

/** What is written in the data files. */
export type PersonEntry = {
  /** GitHub username, e.g. "octocat". The only required field. */
  github: string;
  /** Shown instead of the GitHub profile name. */
  name?: string;
  /** Shown instead of the website set on the GitHub profile. */
  portfolio?: string;
  /** Founder, Maintainer, Catalyst. */
  role?: string;
  /** One line under the name. */
  note?: string;
  /** Hubs they build in: Web2, Web3, AI, Hardware, Design. */
  interests?: string[];
  /** ISO date they joined, e.g. "2026-09-20". Only used to sort. */
  joined?: string;
};

/** What the pages render. */
export type Person = {
  login: string;
  name: string;
  avatar: string;
  github: string;
  portfolio?: string;
  role?: string;
  note?: string;
  interests?: string[];
  joined?: string;
};
