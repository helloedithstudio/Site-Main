import type { Metadata } from "next";
import Join from "@/components/join/Join";
import "@/styles/docs.css";
import "@/styles/legion.css";
import "@/styles/join.css";

// A working page for new members, not for search: it stays out of the index and out of the sitemap.
export const metadata: Metadata = {
  title: "Catalyst form | edith",
  description: "Finish joining edith: a two minute form, due within 24 hours of joining the Discord.",
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return <Join />;
}
