"use client";

// Chapter 1, Ignition. The opening film plays as the visitor scrolls: a red spark falls onto raw stone, the veins
// ignite, the shell burns away and the polished monolith turns to camera. On its last, still frames the headline lands,
// then the film dissolves into the live 3D scene at exactly the same camera (chapter 2, the handoff) and a caption
// admits it: this stopped being a video a second ago. The dissolve waits until the live scene is ready, so a slow
// connection never shows a hole.
//
// Static mode (weak devices, reduced motion): the film's final frame as a still, with the same words.

import { useEffect, useRef } from "react";
import { getRuntime } from "@/lib/runtime";
import { ScrollTrigger } from "@/lib/runtime/gsap";
import { showcaseMedia, showcasePage } from "@/lib/showcase";
import { showcaseState } from "@/lib/gl/showcaseState";
import { sound } from "@/lib/runtime/sound";
import type { Tier } from "@/lib/runtime/tier";
import type { Pitch } from "@/lib/pitchClient";
import type { Mode } from "./types";
import { ease, span, useFilm } from "./useFilm";

const copy = showcasePage;
const film = showcaseMedia.films.ignition;

// Scroll progress (0 to 1 across the chapter) at which each thing happens.
const FILM_END = 0.84; // the last frame of the film
const HEAD = [0.7, 0.78] as const; // headline arrives (the film's hold)
const DISSOLVE = [0.8, 0.88] as const; // film to live scene
const CAPTION = [0.88, 0.92] as const;
const GL_FROM = 0.74; // start drawing the live scene just before it is revealed

export default function Ignition({ mode, tier, pitch }: { mode: Mode; tier: Tier; pitch: Pitch | null }) {
  const immersive = mode === "immersive";
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const spark = useRef<HTMLSpanElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);

  const { seq, variant } = useFilm(immersive, film, tier, canvas, section, {
    eager: true,
    onFirstDraw: () => spark.current?.classList.add("is-out"),
  });

  useEffect(() => {
    if (!immersive || !section.current) return;
    getRuntime();
    let last = 0;
    let revealed = false;
    let inView = true;
    const apply = (p: number) => {
      last = p;
      const count = variant.current?.count ?? 1;
      seq.current?.render((count - 1) * Math.min(1, p / FILM_END));
      const dissolve = showcaseState.ready ? ease(span(p, ...DISSOLVE)) : 0;
      if (canvas.current) canvas.current.style.opacity = String(1 - dissolve);
      // in with the film's hold, out just before the hall slides in beneath
      const h = ease(span(p, ...HEAD)) * (1 - ease(span(p, 0.955, 0.995)));
      if (head.current) {
        head.current.style.opacity = String(h);
        head.current.style.transform = `translate3d(0, ${((1 - h) * 2.4).toFixed(3)}rem, 0)`;
      }
      if (caption.current) caption.current.style.opacity = String(showcaseState.ready ? ease(span(p, ...CAPTION)) * (1 - ease(span(p, 0.955, 0.995))) : 0);
      if (intro.current) intro.current.style.opacity = String(1 - ease(span(p, 0.02, 0.08)));
      showcaseState.show("ignition", inView && p > GL_FROM);
      if (dissolve > 0.5 && !revealed) {
        revealed = true;
        sound().cue("swell");
      } else if (dissolve < 0.2) revealed = false;
    };
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => apply(self.progress),
      onToggle: (self) => {
        if (self.isActive) showcaseState.chapter = "ignition";
      },
    });
    const view = ScrollTrigger.create({
      trigger: section.current,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        inView = self.isActive;
        apply(last);
      },
    });
    apply(st.progress);
    const off = showcaseState.onReady(() => apply(last));
    return () => {
      st.kill();
      view.kill();
      off();
      showcaseState.show("ignition", false);
    };
  }, [immersive, seq, variant]);

  const desktop = film.variants["desktop-1920"] ?? film.variants.desktop ?? Object.values(film.variants)[0];
  const portrait = film.variants.portrait ?? desktop;
  const greeting = pitch ? copy.resolve.pitched(pitch.from.name, pitch.forName) : null;
  // (the immersive layout only ever renders in the browser, after the page has measured the device)
  const touch = immersive && window.matchMedia("(pointer: coarse)").matches;

  const words = (
    <>
      <p className="type-caption uppercase text-gold">{copy.eyebrow}</p>
      <h1 className="type-display-xl edith-hero-title sc-ignition__title">{copy.title}</h1>
      <p className="type-body-lg text-white sc-ignition__sub">{copy.subtitle}</p>
    </>
  );

  if (!immersive) {
    return (
      <section className="sc-ignition sc-static" data-hero="">
        <picture className="sc-still">
          <source media="(orientation: portrait)" srcSet={portrait.poster} />
          <img src={desktop.poster} alt="" width={desktop.w} height={desktop.h} decoding="async" />
        </picture>
        <div className="sc-ignition__copy site-max px-20 s:px-0">
          {greeting ? <p className="sc-greet">{greeting}</p> : null}
          {words}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} className="sc-ignition" data-hero="">
      <div className="sc-sticky">
        <canvas ref={canvas} className="sc-film" aria-hidden="true" />
        <span ref={spark} className="sc-spark" aria-hidden="true" />
        <div ref={intro} className="sc-intro">
          {greeting ? <p className="sc-greet">{greeting}</p> : null}
          <p className="sc-cue type-caption uppercase" aria-hidden="true">
            {copy.scroll}
            <i />
          </p>
        </div>
        <div ref={head} className="sc-ignition__copy site-max px-20 s:px-0" style={{ opacity: 0 }}>
          {words}
        </div>
        <p ref={caption} className="sc-handoff type-caption uppercase" style={{ opacity: 0 }}>
          {touch ? copy.handoff.touch : copy.handoff.mouse}
        </p>
      </div>
    </section>
  );
}
