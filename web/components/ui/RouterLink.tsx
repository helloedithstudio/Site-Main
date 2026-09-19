"use client";

// <NuxtLink> for internal routes: next/link plus vue-router's active classes
// (`router-link-active` / `router-link-exact-active`), which the site's CSS targets.
// `#section` targets scroll through Lenis on the home page (and close the mobile menu);
// on other pages they go to `/#section`.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { getRuntime } from "@/lib/runtime";
import { store } from "@/lib/runtime/store";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const RouterLink = forwardRef<HTMLAnchorElement, Props>(function RouterLink({ href, className, onClick, ...rest }, ref) {
  const pathname = usePathname() || "/";

  if (href.startsWith("#")) {
    if (pathname !== "/") return <Link ref={ref} href={`/${href}`} className={className} onClick={onClick} {...rest} />;
    const go = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      store.setFlag("menuMobile", false);
      getRuntime().scroll.to(href);
    };
    return <a ref={ref} href={href} className={className} onClick={go} {...rest} />;
  }

  const exact = pathname === href;
  const active = exact || (href !== "/" && pathname.startsWith(href + "/"));
  const classes = [className, active && "router-link-active", exact && "router-link-exact-active"]
    .filter(Boolean)
    .join(" ");
  return <Link ref={ref} href={href} className={classes || undefined} onClick={onClick} {...rest} />;
});

export default RouterLink;
