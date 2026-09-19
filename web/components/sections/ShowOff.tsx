"use client";

// "Shipped by members": drag carousel of what the community has shipped. There are no projects
// yet, so it shows honest first-ones-land-here cards that point to the Discord.

import { useRef } from "react";
import { home } from "@/lib/content";
import { brand } from "@/lib/brand";
import DragCarousel, { type DragCarouselHandle } from "../ui/DragCarousel";
import ShowCard from "../ui/ShowCard";
import Button from "../ui/Button";
import { ArrowGlyph } from "../ui/Arrow";
import { Columns } from "./Safety";

const item = home.showOff;

export default function ShowOff() {
  const carousel = useRef<DragCarouselHandle>(null);

  const arrowButton =
    "group relative flex items-center justify-center min-w-45 max-w-45 h-35 rounded-[4.5rem] bg-brown-dark border border-brown text-gold type-caption";

  return (
    <section
      id="show-off"
      data-quick-link="Show off"
      className="bg-brown-darker relative border-t border-brown-dark overflow-hidden z-3"
    >
      <div className="relative pt-65 s:pt-180 pb-65 s:pb-90 s:border-b s:border-brown-dark">
        <Columns />
        <div className="relative site-max flex flex-col items-center z-2">
          <h2 className="type-h2 text-center" dangerouslySetInnerHTML={{ __html: item.title }} />
          <h3
            className="type-body-lg text-white mt-20 text-center s:max-w-[50rem]"
            dangerouslySetInnerHTML={{ __html: item.subtitle }}
          />
        </div>
      </div>
      <div className="relative">
        <Columns />
        <div className="relative flex flex-col items-center s:pt-80 pb-65 s:pb-180 z-2">
          <DragCarousel ref={carousel} className="relative w-full min-w-0">
            <div className="relative site-max">
              <div className="s:overflow-hidden s:p-20">
                <div className="flex mx-20 s:mx-0 js-slides">
                  {item.cards.map((card) => (
                    <article
                      key={card.id}
                      className="relative flex min-w-full max-w-full mr-20 s:mr-20 s:min-w-[calc((100%-4rem)/3)] s:max-w-[calc((100%-4rem)/3)] sm:mr-85 sm:min-w-[calc((100%-17rem)/3)] sm:max-w-[calc((100%-17rem)/3)] js-slide"
                    >
                      <ShowCard card={card} />
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </DragCarousel>
          <div className="pt-30 flex items-center justify-center gap-30 s:hidden">
            <button type="button" aria-label="Previous" className={arrowButton} onClick={() => carousel.current?.previous()}>
              <ArrowGlyph className="w-auto h-15 rotate-90" />
            </button>
            <button type="button" aria-label="Next" className={arrowButton} onClick={() => carousel.current?.next()}>
              <ArrowGlyph className="w-auto h-15 -rotate-90" />
            </button>
          </div>
          <Button to={brand.discord} className="mt-55">
            {brand.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
