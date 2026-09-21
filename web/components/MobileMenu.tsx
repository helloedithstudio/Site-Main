"use client";

// Small-screen menu overlay. Slides in (mask from the right, content from the left)
// over a tinted backdrop; Escape closes it; focus moves in and is restored on close.

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/runtime/gsap";
import { store, useFlag } from "@/lib/runtime/store";
import Button from "./ui/Button";
import RouterLink from "./ui/RouterLink";
import Social, { socials } from "./ui/Social";
import { TransitionPresence } from "./ui/Transition";
import { brand } from "@/lib/brand";
import { nav } from "@/lib/content";

const navClass = "flex items-center type-caption uppercase py-8 px-15 [&.router-link-exact-active]:text-gold";

export default function MobileMenu() {
  const open = useFlag("menuMobile");
  const bg = useRef<HTMLDivElement>(null);
  const mask = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const saved = useRef<{ bg?: HTMLElement | null; mask?: HTMLElement | null; content?: HTMLElement | null }>({});
  const returnFocus = useRef<Element | null>(null);
  const defaults = { duration: 0.75, ease: "snappy" };

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement;
      queueMicrotask(() =>
        content.current?.querySelector<HTMLElement>("a[href], button")?.focus({ preventScroll: true }),
      );
    } else {
      (returnFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && store.flags.menuMobile) store.setFlag("menuMobile", false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onEnter = (_el: HTMLElement, done: () => void) => {
    done();
    queueMicrotask(() => {
      saved.current = { bg: bg.current, mask: mask.current, content: content.current };
      tl.current?.kill();
      tl.current = gsap
        .timeline({ defaults })
        .fromTo(saved.current.bg!, { alpha: 0 }, { alpha: 1 }, 0)
        .fromTo(
          [saved.current.mask!, saved.current.content!],
          { xPercent: gsap.utils.wrap([100, -75]) },
          { xPercent: 0 },
          0,
        );
    });
  };

  const onLeave = (_el: HTMLElement, done: () => void) => {
    if (store.flags.menuInstant) {
      store.setFlag("menuInstant", false);
      done();
      return;
    }
    tl.current?.kill();
    tl.current = gsap
      .timeline({ defaults })
      .to(saved.current.bg!, { alpha: 0 }, 0)
      .to([saved.current.mask!, saved.current.content!], { xPercent: gsap.utils.wrap([100, -75]) }, 0)
      .call(done);
  };

  return (
    <TransitionPresence show={open} css={false} onEnter={onEnter} onLeave={onLeave}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed inset-0 z-98 overflow-hidden pointer-events-none"
      >
        <div ref={bg} className="absolute inset-0 bg-black/80" />
        <div ref={mask} className="absolute inset-0 overflow-hidden">
          <div
            ref={content}
            className="absolute inset-0 pt-70 flex flex-col justify-between bg-black px-20 pointer-events-auto"
          >
            <div className="flex flex-col">
              <div className="flex justify-center py-25">
                <Button to={brand.discord} item={{ label: brand.cta }} />
              </div>
              <nav>
                <ul className="border-y border-brown-dark divide-y divide-brown-dark">
                  {nav.map((item) => (
                    <li key={item.href}>
                      <RouterLink href={item.href} className={navClass}>
                        {item.label}
                      </RouterLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="flex flex-col pb-20 gap-y-15">
              <div className="flex gap-x-10">
                {socials.map((s) => (
                  <div
                    key={s.id}
                    className="flex-1 flex items-center justify-center aspect-square rounded-3 bg-black border border-brown-dark"
                  >
                    <Social id={s.id} href={s.href} aria-label={s.label} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </TransitionPresence>
  );
}
