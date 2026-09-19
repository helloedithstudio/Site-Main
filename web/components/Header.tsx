"use client";

// Fixed site header — hides on scroll-down past 25% of the viewport, shows on scroll-up.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { ScrollEvent } from "@/lib/runtime/events";
import { store } from "@/lib/runtime/store";
import { throttle } from "@/lib/runtime/timing";
import Logo from "./Logo";
import Button from "./ui/Button";
import { brand } from "@/lib/brand";
import { nav } from "@/lib/content";
import RouterLink from "./ui/RouterLink";
import SocialsMenu from "./SocialsMenu";
import MenuToggle from "./MenuToggle";

const scope = { "data-v-1f0a709d": "" };

const linkClass =
  "type-caption uppercase [&.router-link-exact-active]:text-gold transition-colors duration-300 ease-out has-hover:hover:text-gold";

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const { resize } = getRuntime();
    const onScroll = throttle(({ y, direction }: ScrollEvent) => {
      const threshold = resize.wh * 0.25;
      if (y < threshold) setHidden(false);
      else setHidden(direction === 1);
    }, 50);
    events.on(EVENTS.APP_SCROLL, onScroll);
    return () => {
      events.off(EVENTS.APP_SCROLL, onScroll);
      onScroll.cancel();
    };
  }, []);

  const onLogo = () => {
    if (pathname === "/") getRuntime().scroll.to(0);
    else router.push("/");
  };

  return (
    <header className={`sh fixed top-0 inset-x-0 z-99${hidden ? " is-hidden" : ""}`} {...scope}>
      <div className="relative bg-black/50 border-b border-brown-dark backdrop-blur-sm" {...scope}>
        <div className="site-margin" {...scope}>
          <nav className="relative flex items-center justify-between h-70 s:h-80" {...scope}>
            <button type="button" onClick={onLogo} className="relative" aria-label={brand.name} {...scope}>
              <Logo {...scope} />
            </button>
            <ul className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 hidden s:flex items-center gap-x-40" {...scope}>
              {nav.map((item) => (
                <li key={item.href} {...scope}>
                  <RouterLink href={item.href} className={linkClass} {...scope}>
                    {item.label}
                  </RouterLink>
                </li>
              ))}
            </ul>
            <div className="relative hidden s:flex items-center gap-x-15" {...scope}>
              <Button to={brand.discord} item={{ label: brand.cta }} {...scope} />
              <SocialsMenu scopeAttrs={scope} />
            </div>
            <MenuToggle
              className="s:hidden"
              scopeAttrs={scope}
              onClick={() => store.setFlag("menuMobile", !store.flags.menuMobile)}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
