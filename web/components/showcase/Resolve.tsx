"use client";

// Chapter 7, Resolve. The camera pulls back along the real row of monoliths (always as many as there are exhibits), the
// spark rises and the gold seams light one after another. Then the ask: on a pitch link it names who prepared the page
// and for whom, and books a call with that Maintainer; otherwise it books a call with edith. Builders get a quieter
// second door, Become a Catalyst.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { getRuntime } from "@/lib/runtime";
import { ScrollTrigger } from "@/lib/runtime/gsap";
import { showcasePage } from "@/lib/showcase";
import { showcaseState } from "@/lib/gl/showcaseState";
import { brand } from "@/lib/brand";
import { sound } from "@/lib/runtime/sound";
import type { Pitch } from "@/lib/pitchClient";
import Button from "../ui/Button";
import { ease, span } from "./useFilm";
import type { Mode } from "./types";

const copy = showcasePage.resolve;

export default function Resolve({ mode, pitch }: { mode: Mode; pitch: Pitch | null }) {
  const immersive = mode === "immersive";
  const section = useRef<HTMLElement>(null);
  const ask = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!immersive || !section.current) return;
    getRuntime();
    let bloomed = false;
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        showcaseState.resolve = self.progress;
        const a = ease(span(self.progress, 0.48, 0.62));
        if (ask.current) {
          ask.current.style.opacity = String(a);
          ask.current.style.transform = `translate3d(0, ${((1 - a) * 2.4).toFixed(3)}rem, 0)`;
          ask.current.style.visibility = a > 0.01 ? "" : "hidden";
        }
        if (self.progress > 0.55 && !bloomed) {
          bloomed = true;
          sound().cue("bloom");
        } else if (self.progress < 0.3) bloomed = false;
      },
    });
    const view = ScrollTrigger.create({
      trigger: section.current,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        if (self.isActive) showcaseState.chapter = "resolve";
        showcaseState.show("resolve", self.isActive);
      },
    });
    if (ask.current) {
      ask.current.style.opacity = "0";
      ask.current.style.visibility = "hidden";
    }
    return () => {
      st.kill();
      view.kill();
      showcaseState.show("resolve", false);
    };
  }, [immersive]);

  const booking = pitch?.from.booking ?? brand.booking;
  const words = (
    <div ref={ask} className="sc-ask site-max px-20 s:px-0">
      {pitch ? (
        <p className="sc-ask__from">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pitch.from.avatar} alt="" width={40} height={40} referrerPolicy="no-referrer" />
          {copy.pitched(pitch.from.name, pitch.forName)}
        </p>
      ) : null}
      <h2 className="type-display-xl edith-hero-title sc-ask__title">{copy.title}</h2>
      <div className="sc-ask__actions">
        <Button to={booking}>{pitch ? copy.bookWith(pitch.from.first) : copy.book}</Button>
        <a className="sc-link" href={`mailto:${brand.email}`}>
          {copy.email}
        </a>
        <Link className="sc-link sc-link--quiet" href="/join">
          {copy.join}
        </Link>
      </div>
    </div>
  );

  if (!immersive) return <section className="sc-resolve sc-static">{words}</section>;

  return (
    <section ref={section} className="sc-resolve">
      <div className="sc-sticky">{words}</div>
    </section>
  );
}
