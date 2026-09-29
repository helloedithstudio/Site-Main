"use client";

// Chapter 3, the Hall. Scrolling glides the camera along a row of monoliths, one per exhibit, then the sealed ones that
// wait for the first member launch. The camera rests at each monolith for most of its share of the scroll
// (hallPosition), and the plaque for the monolith at centre fades in: what it is, who built it, what it is made with,
// and where to open it. Every plaque is in the page for screen readers; tabbing into one glides the camera to it.
//
// Static mode: the same plaques as a plain list.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getRuntime } from "@/lib/runtime";
import { ScrollTrigger } from "@/lib/runtime/gsap";
import { hallPosition, showcaseState } from "@/lib/gl/showcaseState";
import { showcasePage } from "@/lib/showcase";
import { sound } from "@/lib/runtime/sound";
import { PersonAvatar } from "../ui/PersonBits";
import type { ExhibitView, Mode } from "./types";

const copy = showcasePage.hall;

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Escapes the text, then turns `channel` into the mono channel style. */
const rich = (t: string) => esc(t).replace(/`([^`]+)`/g, '<span class="edith-ch">$1</span>');

function Open({ exhibit }: { exhibit: ExhibitView }) {
  const label = `${exhibit.urlLabel}`;
  return exhibit.url.startsWith("/") ? (
    <Link href={exhibit.url} className="sc-link">
      {label}
      <span aria-hidden="true">↗</span>
    </Link>
  ) : (
    <a href={exhibit.url} target="_blank" rel="noopener noreferrer" className="sc-link">
      {label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function Plaque({ exhibit, onCloser }: { exhibit: ExhibitView; onCloser: () => void }) {
  return (
    <>
      <p className="sc-plaque__meta">
        <span className="sc-plaque__num">{exhibit.number}</span>
        <span className={`sc-chip sc-chip--${exhibit.phase}`}>{copy.phase[exhibit.phase]}</span>
        {exhibit.youAreHere ? <span className="sc-chip sc-chip--here">{copy.youAreHere}</span> : null}
      </p>
      <h3 className="sc-plaque__title">{exhibit.title}</h3>
      <p className="sc-plaque__summary">{exhibit.summary}</p>
      <div className="sc-plaque__by">
        <span className="sc-plaque__label">{copy.builtBy}</span>
        <ul className="sc-avatars">
          {exhibit.authors.map((p) => (
            <li key={p.login}>
              <a href={p.github} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on GitHub`} title={p.name}>
                <PersonAvatar person={p} className="sc-avatar" />
              </a>
            </li>
          ))}
        </ul>
        <span className="sc-plaque__names">{exhibit.authors.map((p) => p.name).join(", ")}</span>
      </div>
      <ul className="sc-stack" aria-label="Made with">
        {exhibit.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="sc-plaque__actions">
        <button type="button" className="sc-link sc-link--strong" onClick={onCloser} aria-haspopup="dialog">
          {copy.closer}
        </button>
        <Open exhibit={exhibit} />
        {exhibit.source ? (
          <a href={exhibit.source} target="_blank" rel="noopener noreferrer" className="sc-link">
            {copy.source}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </>
  );
}

function Reserved({ number }: { number: string }) {
  return (
    <>
      <p className="sc-plaque__meta">
        <span className="sc-plaque__num">{number}</span>
        <span className="sc-chip sc-chip--reserved">Reserved</span>
      </p>
      <h3 className="sc-plaque__title">{copy.reserved.title}</h3>
      <p className="sc-plaque__summary" dangerouslySetInnerHTML={{ __html: rich(copy.reserved.text) }} />
    </>
  );
}

export default function Hall({
  mode,
  exhibits,
  reserved,
  onCloser,
}: {
  mode: Mode;
  exhibits: ExhibitView[];
  reserved: number;
  onCloser: (index: number) => void;
}) {
  const immersive = mode === "immersive";
  const slots = exhibits.length + reserved;
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const numbers = Array.from({ length: slots }, (_, i) => String(i + 1).padStart(2, "0"));

  useEffect(() => {
    if (!immersive || !section.current) return;
    getRuntime();
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        showcaseState.hall = self.progress;
        const i = Math.round(hallPosition(self.progress, slots));
        if (i !== activeRef.current) {
          activeRef.current = i;
          setActive(i);
          sound().cue("tick");
        }
      },
      onToggle: (self) => setPinned(self.isActive),
    });
    // The live scene shows through for as long as any part of the hall is on screen.
    const view = ScrollTrigger.create({
      trigger: section.current,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        if (self.isActive) showcaseState.chapter = "hall";
        showcaseState.show("hall", self.isActive);
      },
    });
    trigger.current = st;
    showcaseState.hall = st.progress;
    return () => {
      st.kill();
      view.kill();
      trigger.current = null;
      showcaseState.show("hall", false);
    };
  }, [immersive, slots]);

  /** Glide to slot `i` (used by the index and when a plaque receives keyboard focus). */
  const go = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    getRuntime().scroll.to(st.start + (st.end - st.start) * (slots > 1 ? i / (slots - 1) : 0), 1.2);
  };

  if (!immersive) {
    return (
      <section className="sc-hall sc-static site-max px-20 s:px-0" aria-labelledby="sc-hall-title">
        <h2 id="sc-hall-title" className="type-caption uppercase text-gold">
          {copy.label}
        </h2>
        <ol className="sc-list">
          {exhibits.map((e, i) => (
            <li key={e.slug} id={e.slug} className="sc-plaque is-static">
              {e.media?.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="sc-plaque__poster" src={e.media.poster} alt="" loading="lazy" decoding="async" />
              ) : null}
              <Plaque exhibit={e} onCloser={() => onCloser(i)} />
            </li>
          ))}
          {Array.from({ length: reserved }, (_, k) => (
            <li key={`reserved-${k}`} className="sc-plaque is-static is-reserved">
              <Reserved number={numbers[exhibits.length + k]} />
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      ref={section}
      className={`sc-hall${pinned ? " is-pinned" : ""}`}
      style={{ height: `${100 + (slots - 1) * 85 + 30}vh` }}
      aria-labelledby="sc-hall-title"
    >
      <div className="sc-sticky">
        <div className="sc-hall__frame site-max px-20 s:px-0">
          <h2 id="sc-hall-title" className="sc-hall__label type-caption uppercase">
            <span className="text-gold">{copy.label}</span>
            <span aria-hidden="true">
              {" "}
              {numbers[active]} / {numbers[slots - 1]}
            </span>
          </h2>
          <ol className="sc-plaques">
            {exhibits.map((e, i) => (
              <li
                key={e.slug}
                id={e.slug}
                className={`sc-plaque${i === active ? " is-active" : ""}`}
                aria-current={i === active ? "true" : undefined}
                onFocus={() => i !== activeRef.current && go(i)}
              >
                <Plaque exhibit={e} onCloser={() => onCloser(i)} />
              </li>
            ))}
            {Array.from({ length: reserved }, (_, k) => {
              const i = exhibits.length + k;
              return (
                <li key={`reserved-${k}`} className={`sc-plaque is-reserved${i === active ? " is-active" : ""}`} aria-current={i === active ? "true" : undefined}>
                  <Reserved number={numbers[i]} />
                </li>
              );
            })}
          </ol>
          <nav className="sc-index" aria-label="Exhibits">
            {numbers.map((n, i) => (
              <button
                key={n}
                type="button"
                className={`sc-index__dot${i === active ? " is-active" : ""}`}
                aria-label={i < exhibits.length ? `Exhibit ${n}: ${exhibits[i].title}` : `Slot ${n}: reserved`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => go(i)}
              >
                {n}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
