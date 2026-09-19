"use client";

// Beliefs (500vh): a pinned canvas plays the 267-frame flower sequence with scroll,
// the frame scales 0.75 → 1, the gold rule grows, and the six belief captions swap with
// SplitText line reveals.

import { useEffect, useRef, useState } from "react";
import { home } from "@/lib/content";
import { gsap, SplitText } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import { TransitionSwitch } from "../ui/Transition";

const item = home.beliefs;
const FRAMES = 267;
const FRAME_W = 1800;
const FRAME_H = 949;
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
    const frames: (HTMLImageElement | null)[] = [];
    const state = { frame: 0 };
    let tl: gsap.core.Timeline | null = null;
    let disposed = false;

    const ready = (i: number) => (frames[i]?.naturalWidth ?? 0) > 0;
    const draw = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      const c = canvas.current;
      if (!c) return;
      const { width, height } = c;
      const s = Math.max(width / FRAME_W, height / FRAME_H);
      const w = FRAME_W * s;
      const h = FRAME_H * s;
      ctx.clearRect(0, 0, width, height);
      ctx.filter = "saturate(1.6) contrast(1.15)";
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.filter = "none";
    };
    const onResize = (ww: number, wh: number) => {
      const c = canvas.current;
      if (!c) return;
      c.width = ww;
      c.height = wh;
      const f = Math.round(state.frame);
      if (ready(f)) draw(c.getContext("2d")!, frames[f]!);
    };

    resize.add(onResize);
    const ctx = canvas.current!.getContext("2d")!;

    Promise.all(
      Array.from(
        { length: FRAMES },
        (_, i) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.src = `/images/flower/frame_${pad(i + 1)}.jpg`;
            img.onload = () => resolve();
            img.onerror = () => {
              frames[i] = null;
              resolve();
            };
            frames[i] = img;
          }),
      ),
    ).then(() => {
      if (disposed || !canvas.current) return;
      if (ready(0)) draw(ctx, frames[0]!);
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
            snap: 1,
            onUpdate: () => {
              const f = Math.round(state.frame);
              if (ready(f)) draw(ctx, frames[f]!);
            },
          } as unknown as gsap.TweenVars,
          0,
        );
    });

    return () => {
      disposed = true;
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
