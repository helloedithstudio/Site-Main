"use client";

// The original "Link" component: <a> for external targets, router link for internal
// ones, a plain <div> when there is nothing to link to.

import { forwardRef, type ReactNode } from "react";
import type { LinkItem } from "@/lib/content";
import { isExternal, resolveLink } from "@/lib/links";
import RouterLink from "./RouterLink";

type Props = {
  to?: string | null;
  item?: LinkItem | null;
  tag?: "a" | "div" | null;
  className?: string;
  children?: ReactNode;
} & Record<`data-${string}`, string>;

const SmartLink = forwardRef<HTMLElement, Props>(function SmartLink({ to, item, tag, className, children, ...rest }, ref) {
  const kind = tag
    ? tag
    : to
      ? isExternal(to)
        ? "a"
        : "router"
      : item?.external
        ? "a"
        : item?.internal
          ? "router"
          : "div";
  const link = resolveLink({ to, item });
  const content = children ?? (item?.label || item?.internal?.title);

  if (kind === "router" && link.href) {
    return (
      <RouterLink ref={ref as React.Ref<HTMLAnchorElement>} href={link.href} className={className} {...rest}>
        {content}
      </RouterLink>
    );
  }
  if (kind === "a") {
    const l = link as { href?: string; target?: string; rel?: string };
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} href={l.href} target={l.target} rel={l.rel} className={className} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={className} {...rest}>
      {content}
    </div>
  );
});

export default SmartLink;
