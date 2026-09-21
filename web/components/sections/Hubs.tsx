"use client";

// "Six hubs, one server", told as the story of one project rather than pitched as a product. Each of the six beats is a
// moment every builder knows (the idea at 11pm, needing someone else, getting stuck), set in the hub where it happens.
// The layered image on the side is the server: the beat you are reading lights its layer. It was rendered in Blender
// (blender/scripts/hub_stack.py), and stays put while you scroll.

import { useEffect, useRef, useState } from "react";
import { home } from "@/lib/content";
import { theme } from "@/lib/theme";
import Button from "../ui/Button";

const { texts, cards } = home.hubs;

// Same ramp the render uses for the six layers: gold, amber, red-pink, magenta.
function hex(n: number) {
  return Math.round(n).toString(16).padStart(2, "0");
}
function rampColour(t: number) {
  const stops = theme.hoverStops.filter((_, i) => i !== 2 && i !== 5); // FEAF01, FF8301, F70C5A, E803D1
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i].slice(1).match(/../g)!.map((v) => parseInt(v, 16));
  const b = stops[i + 1].slice(1).match(/../g)!.map((v) => parseInt(v, 16));
  return `#${a.map((v, k) => hex(v + (b[k] - v) * f)).join("")}`;
}
const colours = cards.map((_, i) => rampColour(i / (cards.length - 1)));

export default function Hubs() {
  const [active, setActive] = useState(0);
  const beats = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // The beat crossing a thin band near the middle of the screen is the live one. On a phone the image is pinned at
    // the top, so the band sits lower.
    const small = window.matchMedia("(max-width: 649px)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.beat));
        });
      },
      { rootMargin: small ? "-52% 0px -24% 0px" : "-42% 0px -42% 0px", threshold: 0 },
    );
    beats.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="hubs" data-quick-link="Hubs" className="relative border-t border-brown-dark z-2">
      <div className="edith-story relative site-max pt-65 s:pt-180 pb-65 s:pb-180 px-20 s:px-0">
        <div className="edith-story__intro">
          <div className="edith-rule edith-rule--short" />
          <h2 className="edith-story__h2" dangerouslySetInnerHTML={{ __html: texts.title }} />
          <p className="edith-story__stand" dangerouslySetInnerHTML={{ __html: texts.subtitle }} />
          <div className="edith-lit edith-story__lit" dangerouslySetInnerHTML={{ __html: texts.text }} />
        </div>

        <div className="edith-story__layout">
          <div className="edith-story__stagewrap">
            <div
              className="edith-stage"
              style={{ "--hub": colours[active] } as React.CSSProperties}
              aria-hidden="true"
            >
              {/* eslint-disable @next/next/no-img-element */}
              <img
                src="/images/hubs/stack-base-2x.webp"
                srcSet="/images/hubs/stack-base-1x.webp 640w, /images/hubs/stack-base-2x.webp 1120w"
                sizes="(min-width: 900px) 500px, 260px"
                alt=""
                width={1120}
                height={1760}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              {cards.map((card, i) => (
                <img
                  key={card.id}
                  className={`edith-stage__glow${i === active ? " is-on" : ""}`}
                  src={`/images/hubs/stack-glow-${i}-2x.webp`}
                  srcSet={`/images/hubs/stack-glow-${i}-1x.webp 640w, /images/hubs/stack-glow-${i}-2x.webp 1120w`}
                  sizes="(min-width: 900px) 500px, 260px"
                  alt=""
                  width={1120}
                  height={1760}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ))}
              {/* eslint-enable @next/next/no-img-element */}
            </div>
          </div>

          <ol className="edith-beats">
            {cards.map((card, i) => (
              <li
                key={card.id}
                ref={(el) => {
                  beats.current[i] = el;
                }}
                data-beat={i}
                aria-current={i === active ? "step" : undefined}
                className={`edith-beat${i === active ? " is-active" : ""}`}
                style={{ "--hub": colours[i] } as React.CSSProperties}
              >
                <span className="edith-beat__tag">
                  {String(i + 1).padStart(2, "0")} {card.hub}
                </span>
                <h3 className="edith-beat__line">{card.line}</h3>
                <p className="edith-lit edith-beat__text" dangerouslySetInnerHTML={{ __html: card.story }} />
              </li>
            ))}
          </ol>
        </div>

        <div className="edith-story__end">
          <p className="edith-lit edith-story__closing" dangerouslySetInnerHTML={{ __html: texts.closing }} />
          <div className="edith-story__cta">
            {texts.links.map((link) => (
              <Button key={link.label} item={link} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
