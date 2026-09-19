"use client";

// "Moderated. Scam-free.": the seal dissolves in through a scroll-scrubbed noise mask, followed by the
// server's safety rules as a static list.

import { useEffect, useRef } from "react";
import { home } from "@/lib/content";
import { gsap, type EffectTimeline } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import NoiseMask from "../ui/NoiseMask";
import Seal from "../ui/Seal";
import Texts from "../ui/Texts";

const item = home.safety;

export function Columns() {
  return (
    <div className="absolute inset-0 z-1 pointer-events-none flex divide-x divide-brown-dark">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex-1 max-s:hidden max-s:first:block max-s:last:block" />
      ))}
    </div>
  );
}

export default function Safety() {
  const seal = useRef<HTMLDivElement>(null);
  const mask = useRef<SVGSVGElement>(null);

  useEffect(() => {
    getRuntime();
    const tl = (
      gsap.timeline({
        scrollTrigger: { trigger: seal.current, start: "top-=50% bottom", end: "bottom center", scrub: true },
      }) as EffectTimeline
    ).noiseReveal(mask.current);
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section id="safety" data-quick-link="Safety" className="border-t border-brown-dark bg-brown-darker relative z-2">
      <Columns />
      <div className="site-max flex flex-col relative z-2">
        <div className="pt-65 s:pt-250 pb-30 flex justify-center w-full">
          <div ref={seal} className="relative text-brown aspect-[240/290] w-full max-w-[20rem] s:max-w-[30rem] sm:max-w-[40rem]">
            <Seal />
            <NoiseMask ref={mask} className="text-brown-darker" />
          </div>
        </div>
        <div className="flex flex-col s:flex-row s:justify-between pb-65 s:pb-180 px-20 s:px-0 s:gap-x-50 sm:gap-x-0">
          <Texts item={{ title: item.title, subtitle: item.subtitle }} className="w-full s:max-w-[50rem]" />
          <div className="relative w-full s:max-w-[50rem] mt-20 s:mt-0 flex flex-col items-start gap-y-20">
            <div className="txt">
              <p dangerouslySetInnerHTML={{ __html: item.text }} />
            </div>
          </div>
        </div>
      </div>
      <ul className="edith-pills relative site-max z-2 px-20 s:px-0 pb-65 s:pb-180">
        {item.rules.map((rule) => (
          <li key={rule} className="border border-brown-dark rounded-full px-15 py-8 type-caption uppercase text-white">
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}
