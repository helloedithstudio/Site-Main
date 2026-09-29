"use client";

// Chapter 4, Take a closer look. A dialog for one exhibit: on the left the live monolith, turned by dragging or with the
// arrow keys (the 3D camera flies to it behind the dialog); on the right three tabs, The brief / How it's built / What
// shipped, with a real excerpt of the code and numbers measured from the repository. It opens from a plaque or straight
// from a link such as /studio#exhibit-01, and the address follows it so a Maintainer can send that link.
//
// Static mode: the same dialog without the live monolith.

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { getRuntime } from "@/lib/runtime";
import { showcaseState } from "@/lib/gl/showcaseState";
import { showcasePage } from "@/lib/showcase";
import type { ExhibitView, Mode } from "./types";

const copy = showcasePage.closer;
type Tab = "brief" | "built" | "shipped";
const TABS: Tab[] = ["brief", "built", "shipped"];

export default function CloserLook({
  mode,
  exhibit,
  index,
  onClose,
}: {
  mode: Mode;
  exhibit: ExhibitView | null;
  index: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("brief");
  const dialog = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const uid = useId();
  const open = !!exhibit;
  const immersive = mode === "immersive";

  // Open: stop page scroll, move the 3D camera to this monolith, put focus in the dialog. Close: undo all of it.
  useEffect(() => {
    if (!open) return;
    const { scroll } = getRuntime();
    const returnTo = document.activeElement as HTMLElement | null;
    scroll.stop();
    if (immersive) {
      showcaseState.previous = showcaseState.chapter === "closer" ? showcaseState.previous : showcaseState.chapter;
      showcaseState.chapter = "closer";
      showcaseState.closer = index;
      showcaseState.turn.x = showcaseState.turn.y = 0;
      showcaseState.show("closer", true);
    }
    queueMicrotask(() => closeBtn.current?.focus({ preventScroll: true }));
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialog.current) return;
      const f = [...dialog.current.querySelectorAll<HTMLElement>("a[href], button, [tabindex='0']")].filter((el) => !el.hasAttribute("disabled"));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      scroll.start();
      if (immersive) {
        showcaseState.chapter = showcaseState.previous;
        showcaseState.closer = -1;
        showcaseState.show("closer", false);
      }
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [open, index, immersive, onClose]);

  if (!exhibit) return null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    showcaseState.turn.y += (e.clientX - drag.current.x) * 0.008;
    showcaseState.turn.x = Math.max(-0.35, Math.min(0.35, showcaseState.turn.x + (e.clientY - drag.current.y) * 0.004));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onStageKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: [0, -0.25], ArrowRight: [0, 0.25], ArrowUp: [-0.12, 0], ArrowDown: [0.12, 0] }[e.key];
    if (!step) return;
    e.preventDefault();
    showcaseState.turn.x = Math.max(-0.35, Math.min(0.35, showcaseState.turn.x + step[0]));
    showcaseState.turn.y += step[1];
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.indexOf(tab);
    const next = e.key === "ArrowRight" ? TABS[(i + 1) % 3] : e.key === "ArrowLeft" ? TABS[(i + 2) % 3] : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  };

  const c = exhibit.closer;
  return (
    <div className={`sc-closer${immersive ? " is-live" : ""}`} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} ref={dialog}>
      {immersive ? (
        <div
          className="sc-closer__stage"
          tabIndex={0}
          role="img"
          aria-label={`${exhibit.title}, the live monolith. ${copy.drag}, or use the arrow keys.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onStageKey}
        >
          <span className="sc-closer__hint type-caption uppercase">{copy.drag}</span>
        </div>
      ) : null}
      <div className="sc-closer__panel">
        <div className="sc-closer__top">
          <p className="type-caption uppercase text-gold">
            {`Exhibit ${exhibit.number}`}
          </p>
          <button ref={closeBtn} type="button" className="sc-closer__close" onClick={onClose}>
            {copy.close}
          </button>
        </div>
        <h2 id={`${uid}-title`} className="sc-closer__title">
          {exhibit.title}
        </h2>
        <div className="sc-tabs" role="tablist" aria-label={exhibit.title}>
          {TABS.map((t) => (
            <button
              key={t}
              id={`${uid}-tab-${t}`}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={`${uid}-panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              className="sc-tab"
              onClick={() => setTab(t)}
              onKeyDown={onTabKey}
            >
              {copy.tabs[t]}
            </button>
          ))}
        </div>
        <div id={`${uid}-panel-brief`} role="tabpanel" aria-labelledby={`${uid}-tab-brief`} hidden={tab !== "brief"} className="sc-panel">
          <p className="sc-panel__lead">{c.brief}</p>
          <p className="sc-panel__text">{exhibit.summary}</p>
        </div>
        <div id={`${uid}-panel-built`} role="tabpanel" aria-labelledby={`${uid}-tab-built`} hidden={tab !== "built"} className="sc-panel">
          <p className="sc-panel__text">{c.built}</p>
          {c.excerpt ? (
            <figure className="sc-code">
              <figcaption>
                <span>{c.excerpt.file}</span>
                <span>{`lines ${c.excerpt.startLine} to ${c.excerpt.endLine}`}</span>
              </figcaption>
              <pre tabIndex={0}>
                <code>{c.excerpt.code}</code>
              </pre>
              <p className="sc-code__note">{c.excerpt.caption}</p>
            </figure>
          ) : null}
        </div>
        <div id={`${uid}-panel-shipped`} role="tabpanel" aria-labelledby={`${uid}-tab-shipped`} hidden={tab !== "shipped"} className="sc-panel">
          <dl className="sc-facts">
            {c.shipped.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="sc-plaque__actions">
            {exhibit.url.startsWith("/") ? (
              <Link href={exhibit.url} className="sc-link sc-link--strong" onClick={onClose}>
                {exhibit.urlLabel}
              </Link>
            ) : (
              <a href={exhibit.url} target="_blank" rel="noopener noreferrer" className="sc-link sc-link--strong">
                {exhibit.urlLabel}
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {exhibit.source ? (
              <a href={exhibit.source} target="_blank" rel="noopener noreferrer" className="sc-link">
                Source<span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
