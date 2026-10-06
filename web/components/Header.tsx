"use client";

// Fixed site header: logo on the left, the page links and the "Become a Catalyst" button on the right (HeaderNav).
// It hides on scroll-down past 25% of the viewport and shows on scroll-up. On the home page it stays up through the
// hero and while the button pushes the links (plus a short dwell), so that hand-over is actually seen.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { ScrollEvent } from "@/lib/runtime/events";
import { store } from "@/lib/runtime/store";
import { throttle } from "@/lib/runtime/timing";
import Logo from "./Logo";
import HeaderNav from "./HeaderNav";
import { brand } from "@/lib/brand";
import MenuToggle from "./MenuToggle";

const scope = { "data-v-1f0a709d": "" };

/** How long the header stays up after the push comes to rest, in ms, so the result can be read before it tucks away. */
const PUSH_DWELL = 450;

/** Pages that open with their own call to action, so the header's button waits until that has passed. */
const HERO_PAGES = new Set(["/"]);

const cta = { label: brand.cta, to: "/join" };

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const heroPage = HERO_PAGES.has(pathname);
  // Where the hero's own button is gone; HeaderNav measures it, this reads it.
  const heroEnd = useRef(0);
  const onHeroEnd = useCallback((y: number) => {
    heroEnd.current = y;
  }, []);
  // The push is in flight, or finished less than PUSH_DWELL ago (a timestamp, 0 when never).
  const push = useRef({ moving: false, settledAt: 0 });
  const onMoving = useCallback((moving: boolean) => {
    push.current.moving = moving;
    if (!moving) push.current.settledAt = performance.now();
  }, []);

  useEffect(() => {
    const { resize } = getRuntime();
    const onScroll = throttle(({ y, direction }: ScrollEvent) => {
      const held =
        heroEnd.current > 0 &&
        (y < heroEnd.current || push.current.moving || performance.now() - push.current.settledAt < PUSH_DWELL);
      if (y < resize.wh * 0.25 || held) setHidden(false);
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
            <HeaderNav heroPage={heroPage} button={cta} onHeroEnd={onHeroEnd} onMoving={onMoving} scopeAttrs={scope} />
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
