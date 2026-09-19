// Link resolution of the original `useLink` helper (BC8HSPre.js `qe` / `Ae`), plus `anchor` links
// (an in-page `#section`) for the edith copy.

import type { LinkItem } from "./content";

export const isExternal = (to: unknown): to is string =>
  typeof to === "string" &&
  (to.startsWith("http://") || to.startsWith("https://") || to.startsWith("www.") || to.startsWith("mailto:"));

export type ResolvedLink =
  | { href: string; target?: "_blank"; rel?: string; internal?: false }
  | { href: string; internal: true }
  | { href?: undefined; internal?: false };

const withProtocol = (url: string) => (url.startsWith("www.") ? `https://${url}` : url);

export function resolveLink({ to, item }: { to?: string | null; item?: LinkItem | null }): ResolvedLink {
  if (to) {
    if (isExternal(to)) {
      return to.startsWith("mailto:")
        ? { href: to }
        : { href: withProtocol(to), target: "_blank", rel: "noopener noreferrer" };
    }
    return { href: to, internal: true };
  }
  if (item?.external) {
    return item.external.startsWith("mailto:")
      ? { href: item.external }
      : { href: withProtocol(item.external), target: "_blank", rel: "noopener noreferrer" };
  }
  if (item?.internal) {
    const { type, slug } = item.internal;
    if (type === "home") return { href: "/", internal: true };
    if (type === "anchor") return { href: `#${slug || ""}`, internal: true };
    return { href: `/${slug || ""}`, internal: true };
  }
  return {};
}
