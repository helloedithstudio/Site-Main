import type { Exhibit, Fact } from "@/lib/showcase";
import type { Person } from "@/lib/people";

/** An exhibit as the page receives it: builders resolved to people, the code excerpt resolved to its text. */
export type ExhibitView = Omit<Exhibit, "authors" | "closer"> & {
  authors: Person[];
  closer: {
    brief: string;
    built: string;
    excerpt?: { caption: string; code: string; file: string; startLine: number; endLine: number };
    shipped: Fact[];
  };
};

export type BuildFactsView = { label: string; value: string }[];

/** "high" and "mid" get the films and the live scene; "low" (and reduced motion) gets the still, readable page. */
export type Mode = "pending" | "static" | "immersive";
