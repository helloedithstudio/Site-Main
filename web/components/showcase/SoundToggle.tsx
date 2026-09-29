"use client";

// The Showcase sound switch: bottom corner, off until the visitor turns it on (lib/runtime/sound.ts).

import { showcasePage } from "@/lib/showcase";
import { sound, useSound } from "@/lib/runtime/sound";

export default function SoundToggle() {
  const { on, playing } = useSound();
  return (
    <button
      type="button"
      className={`sc-sound${on ? " is-on" : ""}${playing ? " is-playing" : ""}`}
      aria-pressed={on}
      onClick={() => sound().toggle()}
    >
      <span className="sc-sound__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="type-caption uppercase">{on ? showcasePage.sound.on : showcasePage.sound.off}</span>
    </button>
  );
}
