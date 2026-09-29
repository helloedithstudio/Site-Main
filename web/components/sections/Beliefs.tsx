"use client";

// Beliefs (500vh): a pinned canvas plays a 96-frame Blender sequence (WebP, loaded lazily) with scroll: the six hub
// layers of the server open, light one by one in the hub colours and the camera settles (blender/scripts/beliefs_orbit.py,
// frames made by scripts/make-beliefs-frames.cjs). Neighbouring frames are cross-faded so 96 frames scrub smoothly.
// The frame scales 0.75 → 1, the gold rule grows, and the six belief captions swap with SplitText line reveals.

import { useEffect, useRef, useState } from "react";
import { home } from "@/lib/content";
import { gsap, SplitText } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import { createFrameSequence } from "@/lib/runtime/frameSequence";
import { TransitionSwitch } from "../ui/Transition";

const item = home.beliefs;
const FRAMES = 96;
// Tall crop of the render: the stack only fills the middle of a wide screen, so the frames are fitted to the canvas
// height and the black sides are not stored.
const FRAME_W = 1000;
const FRAME_H = 1400;
const FRAME_CONCURRENCY = 4;
// Start fetching the sequence this long after mount even if the section is far away (ms).
const FRAME_IDLE_START = 9000;
const pad = (n: number) => String(n).padStart(4, "0");

export default function Beliefs() {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scale = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const textBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { resize } = getRuntime();
    const state = { frame: 0 };
    let tl: gsap.core.Timeline | null = null;

    // The sequence is a few MB, so it must not compete with the WebGL assets at page load: it starts loading once the
    // section is near, or a little after the page has settled (lib/runtime/frameSequence.ts).
    const seq = createFrameSequence({
      count: FRAMES,
      src: (i) => `/images/beliefs/frame_${pad(i + 1)}.webp`,
      canvas: canvas.current!,
      frame: { w: FRAME_W, h: FRAME_H },
      fit: "height",
      concurrency: FRAME_CONCURRENCY,
      idleStart: FRAME_IDLE_START,
      near: section.current,
    });
    const onResize = (ww: number, wh: number) => seq.resize(ww, wh);
    resize.add(onResize);

    const duration = 3;
    tl = gsap
      .timeline({
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          refreshPriority: -1,
          onUpdate: (st) => {
            const next = Math.round(st.progress * (item.items.length - 1));
            if (next !== indexRef.current) {
              // watch(index) → lock the text box height before the swap
              if (textBox.current) gsap.set(textBox.current, { height: textBox.current.offsetHeight });
              indexRef.current = next;
              setIndex(next);
            }
          },
        },
        defaults: { duration, ease: "none" },
      })
      .fromTo(scale.current, { scale: 0.75 }, { scale: 1, duration: duration / 3, ease: "power1.inOut" }, 0)
      .fromTo(line.current, { scaleX: 0 }, { scaleX: 1 }, 0)
      .to(
        state,
        {
          frame: FRAMES - 1,
          onUpdate: () => seq.render(state.frame),
        } as unknown as gsap.TweenVars,
        0,
      );

    return () => {
      seq.destroy();
      resize.remove(onResize);
      tl?.kill();
    };
  }, []);

  const onEnter = (el: HTMLElement, done: () => void) => {
    done();
    const split = SplitText.create(el, { type: "lines", mask: "lines" });
    if (textBox.current) {
      gsap.to(textBox.current, {
        height: el.offsetHeight,
        duration: 1,
        delay: 0.5,
        ease: "expo",
        overwrite: true,
        onComplete: () => {
          gsap.set(textBox.current, { height: "auto" });
        },
      });
    }
    gsap.from(split.lines, { yPercent: 105, duration: 1, stagger: 0.05, delay: 0.5, ease: "expo" });
  };
  const onLeave = (el: HTMLElement, done: () => void) => {
    gsap.to(SplitText.create(el, { type: "lines", mask: "lines" }).lines, {
      yPercent: -105,
      duration: 0.5,
      stagger: 0.05,
      ease: "power2.in",
      onComplete: done,
    });
  };

  return (
    <section
      ref={section}
      id="beliefs"
      data-quick-link="Beliefs"
      className="edith-beliefs relative border-t border-brown-dark z-2"
    >
      <div className="sticky top-0 h-full-screen w-full overflow-hidden">
        <div ref={scale} className="absolute inset-0 pointer-events-none z-1">
          <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
          <div className="absolute bottom-20 inset-x-20 s:right-auto s:bottom-75 s:left-1/2 s:-translate-x-1/2 s:w-full s:max-w-[70rem] px-20 s:px-120 py-20 s:py-50 border border-brown-dark rounded-[.5rem] overflow-hidden bg-black z-3">
            <div ref={textBox} className="relative stack items-start type-body-xs s:type-body-md">
              <TransitionSwitch onEnter={onEnter} onLeave={onLeave}>
                <div key={index} dangerouslySetInnerHTML={{ __html: item.items[index].text }} />
              </TransitionSwitch>
            </div>
            <div ref={line} className="absolute bottom-0 inset-x-0 border-b border-gold origin-left z-2" />
          </div>
        </div>
      </div>
    </section>
  );
}
