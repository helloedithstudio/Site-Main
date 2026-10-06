"use client";

// The right end of the header: the page links (The Legion, Docs) and the "Become a Catalyst" button.
//
// On pages that open with their own call to action (the home hero) the button stays out of the header
// until that opening is behind you.
// Then it slides in from the right edge and pushes the links left, one rigid unit: the gap between the button and the
// links never changes while it moves, like a train car shoving the one ahead. Scrolling back up into the hero reverses
// it. On every other page there is no hero button, so it is simply there.
//
// The motion is a damped spring (the kind Apple's interfaces use), not a fixed-time tween. It carries velocity, so
// reversing half way through does not restart or jolt: the links decelerate and swing back. It is driven by the Lenis
// tick, and the scroll position only ever decides the target (0 hidden, 1 shown).

import { useEffect, useRef } from "react";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { ScrollEvent, TickEvent } from "@/lib/runtime/events";
import Button from "./ui/Button";
import RouterLink from "./ui/RouterLink";
import { nav } from "@/lib/content";

/** Seconds for one swing of the spring (SwiftUI's "response"). Higher is slower and softer. */
const RESPONSE = 0.6;
/** 1 is critically damped (settles with no overshoot). Just under 1 gives a barely visible, natural settle. */
const DAMPING = 0.9;
/** Longest slice of time one tick may advance, in seconds. A hitch (route change, heavy WebGL frame) must not skip the motion. */
const MAX_DT = 0.05;
const SUBSTEP = 1 / 120;

const OMEGA = (2 * Math.PI) / RESPONSE;
const STIFFNESS = OMEGA * OMEGA;
const DRAG = 2 * DAMPING * OMEGA;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);

const linkClass =
  "type-caption uppercase [&.router-link-exact-active]:text-gold transition-colors duration-300 ease-out has-hover:hover:text-gold";

/**
 * Scroll position at which the hero's own button has finished fading out. Hero.tsx scrubs its fade until the hero's
 * bottom edge reaches the middle of the screen, so that is where the header's button takes over. 0 when there is no hero.
 */
export function measureHeroEnd(wh: number, scrollY: number): number {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return 0;
  return Math.max(0, hero.getBoundingClientRect().bottom + scrollY - wh * 0.5);
}

export default function HeaderNav({
  heroPage,
  button,
  onHeroEnd,
  onMoving,
  scopeAttrs,
}: {
  /** True on a page that opens with its own call to action ([data-hero]), so the header's waits until it has passed. */
  heroPage: boolean;
  /** The button: "Become a Catalyst". */
  button: { label: string; to: string };
  /** Told where the hero's button is gone, so the header can stay on screen while the push plays. */
  onHeroEnd: (y: number) => void;
  /** Told when the push starts and when it comes to rest, so the header does not tuck away mid-push. */
  onMoving: (moving: boolean) => void;
  scopeAttrs?: Record<string, string>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const links = useRef<HTMLUListElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  // Position and velocity outlive route changes, so leaving the home page pushes the button in rather than snapping it.
  const motion = useRef<{ x: number; v: number } | null>(null);

  useEffect(() => {
    const rootEl = root.current;
    const linksEl = links.current;
    const ctaEl = cta.current;
    if (!rootEl || !linksEl || !ctaEl) return;
    const { scroll, resize } = getRuntime();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let heroEnd = 0;
    let travel = 0; // px the unit sits to the right of its resting place when the button is hidden
    let past = false;
    let target = 1;
    let x = motion.current?.x ?? 1;
    let v = motion.current?.v ?? 0;
    let idle = true;
    const setIdle = (next: boolean) => {
      if (next === idle) return;
      idle = next;
      onMoving(!next);
    };

    const apply = () => {
      motion.current = { x, v };
      const off = travel * (1 - x);
      // at rest, land on whole pixels so the type stays crisp
      const moving = idle ? Math.round(off) : off;
      const t = moving === 0 ? "" : `translate3d(${moving.toFixed(2)}px, 0, 0)`;
      linksEl.style.transform = t;
      ctaEl.style.transform = t;
      // the button fades in as it clears the edge, not from the first pixel
      const o = smooth(clamp01((x - 0.1) / 0.5));
      ctaEl.style.opacity = o >= 1 ? "" : String(o);
      ctaEl.style.visibility = o > 0.001 ? "" : "hidden";
      ctaEl.toggleAttribute("inert", x < 0.5);
    };

    const measure = () => {
      const gap = parseFloat(getComputedStyle(rootEl).columnGap) || 0;
      travel = ctaEl.offsetWidth + gap;
      heroEnd = heroPage ? measureHeroEnd(resize.wh, scroll.y) : 0;
      onHeroEnd(heroEnd);
      past = scroll.y >= heroEnd;
      retarget();
    };

    const retarget = () => {
      target = !heroPage || past ? 1 : 0;
      if (reduce.matches) {
        x = target;
        v = 0;
        setIdle(true);
        apply();
      } else if (x !== target || v !== 0) setIdle(false);
    };

    const onScroll = ({ y }: ScrollEvent) => {
      const now = y >= heroEnd;
      if (now === past) return;
      past = now;
      retarget();
    };

    const onTick = ({ ratio }: TickEvent) => {
      if (idle) return;
      const dt = Math.min(ratio / 60, MAX_DT);
      const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        v += (STIFFNESS * (target - x) - DRAG * v) * h;
        x += v * h;
      }
      if (Math.abs(target - x) < 0.0005 && Math.abs(v) < 0.005) {
        x = target;
        v = 0;
        setIdle(true);
      }
      apply();
    };

    // First paint starts settled; after a route change it carries on from where it was.
    const fresh = motion.current === null;
    measure();
    if (fresh) {
      x = target;
      v = 0;
      setIdle(true);
    }
    apply();

    const ro = new ResizeObserver(measure);
    ro.observe(ctaEl);
    resize.add(measure);
    events.on(EVENTS.APP_SCROLL, onScroll);
    events.on(EVENTS.APP_TICK, onTick);
    return () => {
      ro.disconnect();
      resize.remove(measure);
      events.off(EVENTS.APP_SCROLL, onScroll);
      events.off(EVENTS.APP_TICK, onTick);
      onMoving(false);
    };
  }, [heroPage, onHeroEnd, onMoving]);

  return (
    <div ref={root} className="relative hidden s:flex items-center gap-x-40" {...scopeAttrs}>
      <ul ref={links} className="flex items-center gap-x-40 will-change-transform" {...scopeAttrs}>
        {nav.map((item) => (
          <li key={item.href} {...scopeAttrs}>
            <RouterLink href={item.href} className={linkClass} {...scopeAttrs}>
              {item.label}
            </RouterLink>
          </li>
        ))}
      </ul>
      <div ref={cta} className="will-change-transform" {...scopeAttrs}>
        <Button to={button.to} item={{ label: button.label }} {...scopeAttrs} />
      </div>
    </div>
  );
}
