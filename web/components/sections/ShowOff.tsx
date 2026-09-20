"use client";

// "Shipped by members", shown as a product lineup: three plinths, each with a floating project card that is still a
// skeleton, because nothing has shipped yet and the page says so. The cards rise left to right (ship it, show it,
// launch it), the middle one is the largest, and the step you pick lights its card. Rendered in Blender (see
// blender/scripts/ship_lineup.py). Nothing is invented: the cards are placeholders, the captions are the old card copy.

import { home } from "@/lib/content";
import { brand } from "@/lib/brand";
import { theme } from "@/lib/theme";
import { useLitCycle } from "@/lib/runtime/useLitCycle";
import Button from "../ui/Button";

const item = home.showOff;

// gold, red-pink, magenta: the marble ramp, one per card
const colours = [theme.hoverStops[0], theme.hoverStops[3], theme.hoverStops[4]];
// where the phone crop looks: the left card, the middle one, the right one
const pans = ["0%", "50%", "100%"];
const AUTO_MS = 5200;

export default function ShowOff() {
  const { root, active, auto, inView, pick, next } = useLitCycle(item.cards.length);

  return (
    <section
      id="show-off"
      data-quick-link="Show off"
      ref={root}
      className="bg-brown-darker relative border-t border-brown-dark overflow-hidden z-3"
    >
      <div
        className="edith-lineup relative site-max pt-65 s:pt-180 pb-65 s:pb-180 px-20 s:px-0"
        data-auto={auto}
        data-inview={inView}
        style={{ "--edith-auto": `${AUTO_MS}ms` } as React.CSSProperties}
      >
        <h2 className="edith-lineup__h2" dangerouslySetInnerHTML={{ __html: item.title }} />
        <p className="edith-lineup__lit" dangerouslySetInnerHTML={{ __html: item.subtitle }} />

        <div
          className="edith-lineup__stage"
          style={{ "--pan": pans[active] } as React.CSSProperties}
          role="img"
          aria-label={`Three plinths, each with a project card that has not shipped yet: ${item.cards[active].title} is lit.`}
        >
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src="/images/hubs/lineup-base-2x.webp"
            srcSet="/images/hubs/lineup-base-1x.webp 800w, /images/hubs/lineup-base-2x.webp 1600w"
            sizes="(min-width: 650px) 1100px, 100vw"
            alt=""
            width={1600}
            height={720}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          {item.cards.map((card, i) => (
            <img
              key={card.id}
              className={`edith-stage__glow${i === active ? " is-on" : ""}`}
              src={`/images/hubs/lineup-glow-${i}-2x.webp`}
              srcSet={`/images/hubs/lineup-glow-${i}-1x.webp 800w, /images/hubs/lineup-glow-${i}-2x.webp 1600w`}
              sizes="(min-width: 650px) 1100px, 100vw"
              alt=""
              width={1600}
              height={720}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ))}
          {/* eslint-enable @next/next/no-img-element */}
        </div>

        <ol className="edith-steps">
          {item.cards.map((card, i) => (
            <li
              key={card.id}
              className={`edith-step${i === active ? " is-active" : ""}`}
              style={{ "--hub": colours[i] } as React.CSSProperties}
              onAnimationEnd={i === active && auto ? next : undefined}
            >
              <div className="edith-rule edith-row__rule" aria-hidden="true" />
              <button type="button" className="edith-step__btn" aria-pressed={i === active} onClick={() => pick(i)}>
                <span className="edith-step__tag">{card.tag}</span>
                <span className="edith-step__title">{card.title}</span>
                <span className="edith-step__text" dangerouslySetInnerHTML={{ __html: card.text }} />
              </button>
            </li>
          ))}
        </ol>

        <Button to={brand.discord} className="mt-55">
          {brand.cta}
        </Button>
      </div>
    </section>
  );
}
