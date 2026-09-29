"use client";

// The Studio page (/studio): the page edith members send when they pitch. One idea carries it: a film that turns
// live. The chapters, in order: Ignition (film, then the handoff to the live scene), the Hall of exhibits, Take a closer
// look (a dialog), Under the hood (film, then the live X-ray and readouts), the people, and Resolve (the ask).
//
// The server renders the still, readable version of every chapter. Once the page knows what the device can do
// (lib/runtime/tier.ts), capable devices switch to the immersive version: pinned chapters, the films and the live 3D.
// The words and links are the same in both.

import { useCallback, useEffect, useState } from "react";
import GlCanvas from "@/components/GlCanvas";
import Footer from "@/components/Footer";
import { decideTier, type Tier } from "@/lib/runtime/tier";
import { showcaseState } from "@/lib/gl/showcaseState";
import { startPitch, usePitch } from "@/lib/pitchClient";
import Ignition from "./Ignition";
import Hall from "./Hall";
import CloserLook from "./CloserLook";
import UnderTheHood from "./UnderTheHood";
import People from "./People";
import Resolve from "./Resolve";
import SoundToggle from "./SoundToggle";
import { portraitScreen } from "./useFilm";
import type { Person } from "@/lib/people";
import type { BuildFactsView, ExhibitView, Mode } from "./types";

export default function Showcase({
  exhibits,
  reserved,
  maintainers,
  facts,
}: {
  exhibits: ExhibitView[];
  reserved: number;
  maintainers: Person[];
  facts: BuildFactsView;
}) {
  const [mode, setMode] = useState<Mode>("pending");
  const [tier, setTier] = useState<Tier>("high");
  const [closer, setCloser] = useState(-1);
  const pitch = usePitch();

  useEffect(() => {
    startPitch();
    showcaseState.reset();
    showcaseState.mountedAt = performance.now();
    showcaseState.exhibits = exhibits.map((e) => ({
      slug: e.slug,
      live: true,
      video: e.media?.webm || e.media?.mp4 ? { webm: e.media?.webm, mp4: e.media?.mp4 } : undefined,
      poster: e.media?.poster,
    }));
    showcaseState.reserved = reserved;
    showcaseState.portrait = portraitScreen();
    let cancelled = false;
    decideTier().then((t) => {
      if (cancelled) return;
      setTier(t);
      if (t === "low") setMode("static");
      else {
        showcaseState.tier = t;
        setMode("immersive");
      }
      // A link such as /studio#exhibit-01 opens that exhibit's closer look.
      const i = exhibits.findIndex((e) => `#${e.slug}` === window.location.hash);
      if (i >= 0) setCloser(i);
    });
    return () => {
      cancelled = true;
    };
  }, [exhibits, reserved]);

  const openCloser = useCallback(
    (i: number) => {
      setCloser(i);
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${exhibits[i].slug}`);
    },
    [exhibits],
  );
  const closeCloser = useCallback(() => {
    setCloser(-1);
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  const immersive = mode === "immersive";
  return (
    <main id="main" className={`sc${immersive ? " is-immersive" : ""}${closer >= 0 ? " is-closer" : ""}`}>
      {immersive ? <GlCanvas page="showcase" /> : null}
      <div className="sc-chapters">
        <Ignition mode={mode} tier={tier} pitch={pitch} />
        <Hall mode={mode} exhibits={exhibits} reserved={reserved} onCloser={openCloser} />
        <UnderTheHood mode={mode} tier={tier} facts={facts} />
        <People maintainers={maintainers} />
        <Resolve mode={mode} pitch={pitch} />
        <Footer />
      </div>
      <CloserLook key={closer} mode={mode} exhibit={closer >= 0 ? exhibits[closer] : null} index={closer} onClose={closeCloser} />
      {mode !== "pending" ? <SoundToggle /> : null}
    </main>
  );
}
