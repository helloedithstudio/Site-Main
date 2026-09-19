// "Why builders stick around": the first thing after the hero says what edith actually gives you, in four tiles
// (the Apple "highlights" pattern). The hero marble scroll-morphs toward the hidden marker below, then fades.

import { whatIs } from "@/lib/content";

export default function WhatIsEdith() {
  return (
    <section id="why-edith" data-quick-link="Why edith" className="relative z-2">
      <div className="edith-hero-end" data-js="gl-hero-end" aria-hidden="true" />
      <div className="relative site-max pt-65 s:pt-180 pb-40 edith-intro-pb flex flex-col items-center text-center gap-y-15 px-20 s:px-0">
        <div className="edith-rule edith-rule--short mb-20" />
        <h2 className="type-h2" dangerouslySetInnerHTML={{ __html: whatIs.title }} />
        <p className="type-body-lg text-white s:max-w-[60rem]" dangerouslySetInnerHTML={{ __html: whatIs.subtitle }} />
      </div>
      <div className="relative site-max px-20 s:px-0 pb-65 s:pb-180">
        <ul className="edith-tiles border-b border-brown-dark bg-black/50">
          {whatIs.items.map((item, i) => (
            <li key={item.id} className="edith-tile border-brown-dark">
              <span className="type-caption uppercase text-brown">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="type-h3 mt-15" dangerouslySetInnerHTML={{ __html: item.title }} />
              <p className="edith-tile-text type-body-md text-white mt-15" dangerouslySetInnerHTML={{ __html: item.text }} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
