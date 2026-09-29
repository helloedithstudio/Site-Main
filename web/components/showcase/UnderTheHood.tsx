"use client";

// Chapter 5, Under the hood. The exploded film takes the monolith apart into its layers (glass, display, gold seam,
// stone), then dissolves into the live X-ray of the same pose: scrolling sweeps a scan line through the object, from the
// finished render to its wireframe, its surface normals and its light alone, and back. Beside it, readouts measured in
// the visitor's own browser, right now: frame rate, triangles, draw calls, how long the scene took, bytes downloaded, the
// graphics chip. Nothing is sent anywhere. Below, facts measured from the repository when the page was built.
//
// Static mode: the film's last frame as a still, the readouts that do not need the live scene, and the facts.

import { useEffect, useRef, useState } from "react";
import { getRuntime } from "@/lib/runtime";
import { ScrollTrigger } from "@/lib/runtime/gsap";
import { showcaseMedia, showcasePage } from "@/lib/showcase";
import { showcaseState } from "@/lib/gl/showcaseState";
import { sound } from "@/lib/runtime/sound";
import type { Tier } from "@/lib/runtime/tier";
import type { BuildFactsView, Mode } from "./types";
import { ease, span, useFilm } from "./useFilm";

const copy = showcasePage.hood;
const film = showcaseMedia.films.exploded;
const PASSES = copy.passes;

const FILM_END = 0.8;
const DISSOLVE = [0.82, 0.92] as const;

type Readings = { fps: number; triangles: number; calls: number; loaded: number; bytes: number; gpu: string };

const mb = (b: number) => `${(b / 1_000_000).toFixed(1)} MB`;

/** Bytes this page has fetched from its own site so far (other sites do not report sizes to it). */
function downloaded() {
  let total = 0;
  for (const e of performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]) total += e.transferSize || 0;
  for (const e of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) total += e.transferSize || 0;
  return total;
}

function useReadings(active: boolean): Readings | null {
  const [r, setR] = useState<Readings | null>(null);
  useEffect(() => {
    if (!active) return;
    let frames = 0;
    let raf = 0;
    const count = () => {
      frames++;
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
      setR({
        fps,
        triangles: showcaseState.info.triangles,
        calls: showcaseState.info.calls,
        loaded: showcaseState.readyAt ? showcaseState.readyAt - showcaseState.mountedAt : 0,
        bytes: downloaded(),
        gpu: showcaseState.info.gpu,
      });
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [active]);
  return r;
}

function Readouts({ readings, live }: { readings: Readings | null; live: boolean }) {
  const rows: [string, string][] = [];
  const r = readings;
  rows.push([copy.readouts.fps, r ? String(r.fps) : "..."]);
  if (live) {
    rows.push([copy.readouts.triangles, r ? r.triangles.toLocaleString("en-GB") : "..."]);
    rows.push([copy.readouts.calls, r ? String(r.calls) : "..."]);
    rows.push([copy.readouts.loaded, r && r.loaded ? `${(r.loaded / 1000).toFixed(1)} s` : "..."]);
  }
  rows.push([copy.readouts.bytes, r ? mb(r.bytes) : "..."]);
  if (live && r?.gpu) rows.push([copy.readouts.webgl, r.gpu]);
  return (
    <dl className="sc-readouts" aria-live="off">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Facts({ facts }: { facts: BuildFactsView }) {
  return (
    <div className="sc-hood__facts site-max px-20 s:px-0">
      <p className="type-caption uppercase edith-muted">{copy.facts}</p>
      <dl className="sc-facts sc-facts--wide">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function UnderTheHood({ mode, tier, facts }: { mode: Mode; tier: Tier; facts: BuildFactsView }) {
  const immersive = mode === "immersive";
  const filmSection = useRef<HTMLElement>(null);
  const xraySection = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pass, setPass] = useState(0);
  const [inXray, setInXray] = useState(false);
  const readings = useReadings(immersive ? inXray : true);
  const { seq, variant } = useFilm(immersive, film, tier, canvas, filmSection);

  useEffect(() => {
    if (!immersive || !filmSection.current || !xraySection.current) return;
    getRuntime();
    let last = 0;
    let revealed = false;
    const applyFilm = (p: number) => {
      last = p;
      const count = variant.current?.count ?? 1;
      seq.current?.render((count - 1) * Math.min(1, p / FILM_END));
      const dissolve = showcaseState.ready ? ease(span(p, ...DISSOLVE)) : 0;
      if (canvas.current) canvas.current.style.opacity = String(1 - dissolve);
      showcaseState.show("exploded", p > 0.78 && p < 1);
      if (dissolve > 0.5 && !revealed) {
        revealed = true;
        sound().cue("swell");
      } else if (dissolve < 0.2) revealed = false;
    };
    const filmTrigger = ScrollTrigger.create({
      trigger: filmSection.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => applyFilm(self.progress),
      onToggle: (self) => {
        if (self.isActive) {
          showcaseState.chapter = "xray";
          showcaseState.xray = 0;
        } else showcaseState.show("exploded", false);
      },
    });
    let lastPass = -1;
    const xrayTrigger = ScrollTrigger.create({
      trigger: xraySection.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        showcaseState.xray = self.progress;
        const p = Math.round(self.progress * (PASSES.length - 1));
        if (p !== lastPass) {
          lastPass = p;
          setPass(p);
        }
      },
      onToggle: (self) => {
        if (self.isActive) showcaseState.chapter = "xray";
        setInXray(self.isActive);
      },
    });
    const xrayView = ScrollTrigger.create({
      trigger: xraySection.current,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => showcaseState.show("xray", self.isActive),
    });
    applyFilm(filmTrigger.progress);
    const off = showcaseState.onReady(() => applyFilm(last));
    return () => {
      filmTrigger.kill();
      xrayTrigger.kill();
      xrayView.kill();
      off();
      showcaseState.show("exploded", false);
      showcaseState.show("xray", false);
    };
  }, [immersive, seq, variant]);

  const head = (
    <header className="sc-hood__head">
      <p className="type-caption uppercase text-gold">{copy.eyebrow}</p>
      <h2 className="sc-title">{copy.title}</h2>
      <p className="type-body-md text-white sc-hood__intro">{copy.intro}</p>
    </header>
  );

  if (!immersive) {
    const desktop = film.variants["desktop-1920"] ?? film.variants.desktop ?? Object.values(film.variants)[0];
    const portrait = film.variants.portrait ?? desktop;
    return (
      <section className="sc-hood sc-static" aria-labelledby="sc-hood-title">
        <picture className="sc-still sc-still--inline">
          <source media="(orientation: portrait)" srcSet={portrait.poster} />
          <img src={desktop.poster} alt="" width={desktop.w} height={desktop.h} loading="lazy" decoding="async" />
        </picture>
        <div className="site-max px-20 s:px-0" id="sc-hood-title">
          {head}
          <Readouts readings={readings} live={false} />
        </div>
        <Facts facts={facts} />
      </section>
    );
  }

  return (
    <>
      <section ref={filmSection} className="sc-exploded" aria-hidden="true">
        <div className="sc-sticky">
          <canvas ref={canvas} className="sc-film" />
        </div>
      </section>
      <section ref={xraySection} className={`sc-xray${inXray ? " is-in" : ""}`} aria-labelledby="sc-hood-title">
        <div className="sc-sticky">
          <div className="sc-xray__grid" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} style={{ transitionDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <div className="sc-xray__frame site-max px-20 s:px-0">
            <div id="sc-hood-title">{head}</div>
            <ol className="sc-passes" aria-label="Render passes">
              {PASSES.map((name, i) => (
                <li key={`${name}-${i}`} className={i === pass ? "is-active" : undefined} aria-current={i === pass ? "step" : undefined}>
                  <span>{String(i + 1).padStart(2, "0")}</span> {name}
                </li>
              ))}
            </ol>
            <Readouts readings={readings} live />
          </div>
        </div>
      </section>
      <Facts facts={facts} />
    </>
  );
}
