"use client";

// The Showcase soundscape. Off by default; the visitor turns it on. Everything is synthesised with the Web Audio API, so
// there are no audio files to download or license: a low, warm drone (an open D chord through a slowly breathing
// low-pass filter), a little filtered air, and three cues the page plays at its moments: a glass tick when an exhibit
// lights, a swell when a film turns live, and a low bloom at the end.
//
// The choice is remembered (localStorage). Browsers only allow sound after a click or key press, so a remembered "on"
// starts at the visitor's first interaction. Hidden tabs are silent.

import { useSyncExternalStore } from "react";

const KEY = "edith-sound";
const LEVEL = 0.2;
const FADE = 0.6;

type Cue = "tick" | "swell" | "bloom";
type Snapshot = { on: boolean; playing: boolean };

class Soundscape {
  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #filter: BiquadFilterNode | null = null;
  #snap: Snapshot = { on: false, playing: false };
  #listeners = new Set<() => void>();
  #armed = false;

  constructor() {
    if (typeof window === "undefined") return;
    let saved = false;
    try {
      saved = localStorage.getItem(KEY) === "on";
    } catch {
      saved = false;
    }
    if (saved) {
      this.#set({ on: true, playing: false });
      this.#arm();
    }
    document.addEventListener("visibilitychange", () => {
      if (!this.#ctx) return;
      if (document.hidden) void this.#ctx.suspend();
      else if (this.#snap.on) void this.#ctx.resume();
    });
  }

  get snapshot() {
    return this.#snap;
  }

  subscribe = (cb: () => void) => {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  };

  #set(next: Snapshot) {
    this.#snap = next;
    this.#listeners.forEach((l) => l());
  }

  #save(on: boolean) {
    try {
      localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
      // storage blocked: the choice lasts for this page only
    }
  }

  /** Start at the first click or key press (for a remembered "on"). */
  #arm() {
    if (this.#armed) return;
    this.#armed = true;
    const go = () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      this.#armed = false;
      if (this.#snap.on) this.#start();
    };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
  }

  #build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // The drone: D2, A2, D3 and F3, each two slightly detuned saws, through one low-pass that breathes.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.8;
    const pad = ctx.createGain();
    pad.gain.value = 0.11;
    filter.connect(pad).connect(master);
    for (const [hz, level] of [
      [73.42, 1],
      [110, 0.8],
      [146.83, 0.55],
      [174.61, 0.3],
    ]) {
      for (const detune of [-7, 6]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = hz;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 0.12 * level;
        osc.connect(g).connect(filter);
        osc.start();
      }
    }
    const sub = ctx.createOscillator();
    sub.frequency.value = 36.71;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.18;
    sub.connect(subGain).connect(master);
    sub.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 140;
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();

    // Air: soft noise high up, barely there.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const air = ctx.createBufferSource();
    air.buffer = noise;
    air.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 3200;
    band.Q.value = 0.6;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.012;
    air.connect(band).connect(airGain).connect(master);
    air.start();

    this.#ctx = ctx;
    this.#master = master;
    this.#filter = filter;
    return true;
  }

  #start() {
    if (!this.#ctx && !this.#build()) return;
    const ctx = this.#ctx!;
    void ctx.resume();
    const g = this.#master!.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(LEVEL, ctx.currentTime + FADE);
    this.#set({ on: true, playing: true });
  }

  #stop() {
    const ctx = this.#ctx;
    if (ctx && this.#master) {
      const g = this.#master.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(0, ctx.currentTime + FADE);
      window.setTimeout(() => {
        if (!this.#snap.on) void ctx.suspend();
      }, FADE * 1000 + 50);
    }
    this.#set({ on: false, playing: false });
  }

  /** Turn sound on or off. Call from a click, so the browser allows it. */
  toggle() {
    const on = !this.#snap.on;
    this.#save(on);
    if (on) this.#start();
    else this.#stop();
  }

  cue(name: Cue) {
    const ctx = this.#ctx;
    if (!ctx || !this.#master || !this.#snap.playing || document.hidden) return;
    const t = ctx.currentTime;
    const env = (gain: GainNode, peak: number, attack: number, release: number) => {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    };
    if (name === "tick") {
      for (const [hz, peak] of [
        [2637, 0.05],
        [5274, 0.012],
      ]) {
        const osc = ctx.createOscillator();
        osc.frequency.value = hz;
        const g = ctx.createGain();
        env(g, peak, 0.002, 0.16);
        osc.connect(g).connect(this.#master);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } else if (name === "swell") {
      const f = this.#filter!.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(f.value, t);
      f.linearRampToValueAtTime(1500, t + 1.2);
      f.linearRampToValueAtTime(420, t + 3.4);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(293.66, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 1.6);
      const g = ctx.createGain();
      env(g, 0.03, 0.8, 2.2);
      osc.connect(g).connect(this.#master);
      osc.start(t);
      osc.stop(t + 3.2);
    } else {
      for (const [hz, peak] of [
        [55, 0.14],
        [110, 0.04],
      ]) {
        const osc = ctx.createOscillator();
        osc.frequency.value = hz;
        const g = ctx.createGain();
        env(g, peak, 0.9, 3.2);
        osc.connect(g).connect(this.#master);
        osc.start(t);
        osc.stop(t + 4.4);
      }
    }
  }
}

let instance: Soundscape | null = null;
export const sound = () => (instance ??= new Soundscape());

const serverSnap: Snapshot = { on: false, playing: false };

export function useSound(): Snapshot {
  return useSyncExternalStore(
    (cb) => sound().subscribe(cb),
    () => sound().snapshot,
    () => serverSnap,
  );
}
