"use client";

// "Why builders stick around", the way Apple opens a chapter: one large statement with a single gradient phrase,
// a stand-first, then one paragraph whose four lead-ins are the four things edith gives you. No boxes. As the reader
// passes each lead-in it lights from the paragraph's grey to full cream (static and fully lit under reduced motion).
// The hero marble scroll-morphs toward the hidden marker below, then fades: keep that node first and never remount it.

import { useEffect, useRef } from "react";
import { whatIs } from "@/lib/content";
import { gsap } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";

const body = whatIs.items.map((item) => `<strong>${item.title}.</strong> ${item.text}`).join(" ");

export default function WhatIsEdith() {
  const paragraph = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = paragraph.current;
    if (!el || getRuntime().device.features.reducedMotion) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll("strong").forEach((lead) => {
        gsap.fromTo(
          lead,
          { color: "rgba(236,231,224,0.6)" },
          {
            color: "rgba(236,231,224,1)",
            ease: "none",
            scrollTrigger: { trigger: lead, start: "top 82%", end: "top 55%", scrub: true },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="why-edith" data-quick-link="Why edith" className="relative z-2">
      <div className="edith-hero-end" data-js="gl-hero-end" aria-hidden="true" />
      <div className="edith-why relative site-max pt-65 s:pt-180 pb-65 s:pb-180 px-20 s:px-0">
        <div className="edith-rule edith-rule--short" />
        <h2 className="edith-statement" dangerouslySetInnerHTML={{ __html: whatIs.title }} />
        <p className="edith-standfirst" dangerouslySetInnerHTML={{ __html: whatIs.subtitle }} />
        <p ref={paragraph} className="edith-lit edith-why-body" dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </section>
  );
}
