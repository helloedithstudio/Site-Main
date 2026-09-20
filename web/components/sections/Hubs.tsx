"use client";

// "Six hubs, one server", shown the way Apple shows a product: one lit hero image and a list of six hubs. The image
// is a stack of six glossy layers (rendered in Blender, see docs/edith-3d-brief-v2.md and blender/scripts/hub_stack.py)
// and the hub you pick lights its layer. Without a choice the hubs play in turn, the live row's hairline drawing
// left to right as the timer (see useLitCycle). Rows are buttons, so it works on touch and keyboard as well as by hover.

import { useEffect, useRef, type KeyboardEvent } from "react";
import { home } from "@/lib/content";
import { theme } from "@/lib/theme";
import { useLitCycle } from "@/lib/runtime/useLitCycle";
import Button from "../ui/Button";

const { texts, cards } = home.hubs;

const AUTO_MS = 5200;
const HOVER_INTENT_MS = 140;

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

const lit = `<strong>${texts.subtitle}</strong> ${texts.text.replace(/^<p>|<\/p>$/g, "")}`;

export default function Hubs() {
  const { root, active, auto, inView, pick, next } = useLitCycle(cards.length);
  const hoverTimer = useRef<number | undefined>(undefined);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = (active + dir + cards.length) % cards.length;
    pick(i);
    buttons.current[i]?.focus();
  };

  return (
    <section id="hubs" data-quick-link="Hubs" ref={root} className="relative border-t border-brown-dark z-2">
      <div
        className="edith-show relative site-max pt-65 s:pt-180 pb-65 s:pb-180 px-20 s:px-0"
        data-auto={auto}
        data-inview={inView}
        style={{ "--edith-auto": `${AUTO_MS}ms` } as React.CSSProperties}
      >
        <div className="edith-show__head">
          <div className="edith-rule edith-rule--short" />
          <h2 className="edith-show__h2" dangerouslySetInnerHTML={{ __html: texts.title }} />
          <p className="edith-lit edith-show__lit" dangerouslySetInnerHTML={{ __html: lit }} />
          <div className="edith-show__cta flex items-center gap-x-15">
            {texts.links.map((link) => (
              <Button key={link.label} item={link} />
            ))}
          </div>
        </div>

        <ul className="edith-index" onKeyDown={onKey}>
            {cards.map((card, i) => (
              <li
                key={card.id}
                className={`edith-row${i === active ? " is-active" : ""}`}
                style={{ "--hub": colours[i] } as React.CSSProperties}
                onAnimationEnd={i === active && auto ? next : undefined}
              >
                <div className="edith-rule edith-row__rule" aria-hidden="true" />
                <h3 className="edith-row__head">
                  <button
                    type="button"
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    className="edith-row__btn"
                    aria-expanded={i === active}
                    aria-controls={`hub-panel-${card.id}`}
                    onClick={() => pick(i)}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== "mouse" || i === active) return;
                      window.clearTimeout(hoverTimer.current);
                      hoverTimer.current = window.setTimeout(() => pick(i), HOVER_INTENT_MS);
                    }}
                    onPointerLeave={() => window.clearTimeout(hoverTimer.current)}
                  >
                    <span className="edith-row__dot" aria-hidden="true" />
                    <span className="edith-row__name">{card.hub}</span>
                  </button>
                </h3>
                <div id={`hub-panel-${card.id}`} className="edith-row__panel" role="region" aria-label={card.hub}>
                  <div className="edith-row__inner">
                    <p className="edith-row__what">{card.what}</p>
                    <div className="edith-row__ch">
                      {card.channels.map((c) => (
                        <span key={c} className="edith-ch">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
        </ul>

        <div
          className="edith-stage"
          style={{ "--hub": colours[active] } as React.CSSProperties}
          role="img"
          aria-label={`Six stacked layers, one for each hub. The ${cards[active].hub} layer is lit.`}>
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
    </section>
  );
}
