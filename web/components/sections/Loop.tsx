"use client";

// "How an idea becomes a launch": the pinned six-card carousel. The rounded black boxes are drawn by the WebGL layer
// (tracked from .js-slide-box); the content of each card is DOM: a worked example of what a post at that step looks like.

import { useEffect, useRef, useState } from "react";
import { home } from "@/lib/content";
import { ScrollTrigger } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import { store, useFlag } from "@/lib/runtime/store";
import Pager, { type PagerHandle } from "../ui/Pager";
import Arrow from "../ui/Arrow";
import { TransitionSwitch } from "../ui/Transition";
import LoopCard from "./LoopCard";

const item = home.intro;
const GAP = 35;

const slides = item.slides;

export default function Loop() {
  const [current, setCurrent] = useState(0);
  const settled = useFlag("vaultsSettled");
  const section = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const pager = useRef<PagerHandle>(null);

  useEffect(() => {
    const { resize } = getRuntime();
    const small = resize.small;
    const trigger = ScrollTrigger.create({
      trigger: small ? section.current : box.current,
      start: small ? "top bottom" : "top center",
      end: small
        ? () => "+=" + (section.current!.offsetHeight + (pager.current?.deckLength() ?? 0))
        : () => "+=" + (box.current!.offsetHeight + window.innerHeight / 2 + (pager.current?.scrubLength() ?? 0)),
      invalidateOnRefresh: true,
      onToggle: ({ isActive }) => store.setFlag("vaultsRevealed", isActive),
    });
    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <section
      id="how-it-works"
      ref={section}
      data-quick-link="How it works"
      className="relative py-100 s:py-180 s:has-hover:min-h-full-screen s:has-hover:flex s:has-hover:flex-col s:has-hover:justify-center text-center overflow-hidden z-2"
    >
      <div className="absolute inset-0 pointer-events-none" data-js="gl-uniswap-bg" />
      <div className="relative site-max flex flex-col items-center gap-y-15">
        <h2 className="type-h2 px-40 s:px-0" dangerouslySetInnerHTML={{ __html: item.title }} />
        <p className="type-body-lg text-white" dangerouslySetInnerHTML={{ __html: item.subtitle }} />
      </div>
      <div className="relative mt-30 s:mt-55" data-js="gl-uniswap-pin">
        <div
          ref={box}
          className="relative mx-auto site-max max-s:[--margin:1rem] s:w-750 s:aspect-[5/3]"
        >
          <Pager
            ref={pager}
            className="s:absolute s:inset-0 s:[--step:110rem]"
            gap={GAP}
            disabled={!settled}
            pin={() => section.current}
            anchor={() => section.current}
            onChange={setCurrent}
          >
            {slides.map((slide, i) => (
              <div key={i} className="js-slide relative origin-top will-change-transform">
                <div className="edith-loopcard relative rounded-5 overflow-hidden s:aspect-[5/3] js-slide-box">
                  <button
                    type="button"
                    className="edith-loopcard__label s:hidden type-caption uppercase text-white z-4"
                    aria-current={current === i ? "true" : "false"}
                    onClick={() => pager.current?.scrollToCard(i)}
                  >
                    {slide.label}
                  </button>
                  <div className="edith-loopcard__ui z-3">
                    <LoopCard index={i} />
                  </div>
                  <p
                    className="edith-loopcard__copy js-slide-copy s:hidden type-body-md text-white z-4"
                    dangerouslySetInnerHTML={{ __html: slide.text }}
                  />
                </div>
              </div>
            ))}
          </Pager>
          <Arrow
            direction="prev"
            disabled={!settled || current === 0}
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 -ml-175 max-s:hidden z-5"
            onClick={() => pager.current?.previous()}
          />
          <Arrow
            direction="next"
            disabled={!settled || current === slides.length - 1}
            className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 -mr-175 max-s:hidden z-5"
            onClick={() => pager.current?.next()}
          />
        </div>
        <div className="site-max relative mt-25 z-5 max-s:hidden min-h-70">
          <TransitionSwitch name="fade" mode="out-in">
            <div key={current} className="w-full max-w-[50rem] mx-auto">
              <p className="type-caption uppercase text-white">{slides[current].label}</p>
              <p className="type-body-md text-white" dangerouslySetInnerHTML={{ __html: slides[current].text }} />
            </div>
          </TransitionSwitch>
        </div>
      </div>
    </section>
  );
}
