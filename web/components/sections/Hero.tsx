"use client";

import { useEffect, useRef } from "react";
import { home } from "@/lib/content";
import { gsap } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import Button, { DiscordIcon } from "../ui/Button";

const item = home.hero;

export default function Hero() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRuntime();
    const tl = gsap
      .timeline({ scrollTrigger: { trigger: el.current, start: "top top", end: "bottom center", scrub: true } })
      .fromTo(el.current, { alpha: 1 }, { alpha: 0, ease: "power1" });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <span>
      <div className="absolute h-svh s:h-lvh w-full" data-js="gl-hero-bg" />
      <div ref={el} className="relative z-2 max-s:min-h-full-screen s:h-full-screen flex flex-col">
        <div className="absolute inset-0 pointer-events-none" data-js="gl-hero-full" />
        <div className="relative flex-1 flex flex-col" data-js="gl-hero">
          <div className="flex-1 relative flex items-center justify-center">
            <div className="flex flex-col items-center gap-y-15 s:gap-y-30 relative z-2 text-center pt-150 pb-100 s:py-0 px-20 s:px-0">
              <h1 className="type-display-xl edith-hero-title" dangerouslySetInnerHTML={{ __html: item.title }} />
              <Button item={item.link} iconRight={<DiscordIcon />} />
            </div>
          </div>
        </div>
      </div>
    </span>
  );
}
