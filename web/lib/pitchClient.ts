"use client";

// The browser side of Showcase pitch links: reads the token from the address (or from this tab's earlier visit, so the
// greeting survives a trip to another page and back), asks /api/pitch who sent it, and shares the answer with the page
// and the header. A bad or missing token simply leaves everything as it is.

import { useSyncExternalStore } from "react";

export type Pitch = { from: { name: string; first: string; avatar: string; booking: string }; forName: string };

const KEY = "edith-pitch";
let state: Pitch | null = null;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function remembered(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function remember(token: string | null) {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    // private windows and blocked storage: the greeting just does not carry across pages
  }
}

export function startPitch() {
  if (started || typeof window === "undefined") return;
  started = true;
  const fromUrl = new URLSearchParams(window.location.search).get("p");
  const token = fromUrl ?? remembered();
  if (!token) return;
  fetch(`/api/pitch?p=${encodeURIComponent(token)}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { ok: false }))
    .then((j: { ok: boolean; from?: Pitch["from"]; for?: string }) => {
      if (!j.ok || !j.from || !j.for) {
        remember(null);
        return;
      }
      remember(token);
      state = { from: j.from, forName: j.for };
      emit();
    })
    .catch(() => {});
}

export function usePitch(): Pitch | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => null,
  );
}
