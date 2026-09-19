// The Pinia `main` store of the original app — only the UI flags are dynamic,
// the CMS globals (site / footer) live in lib/content.ts.

import { useSyncExternalStore } from "react";

export type Flags = {
  loaded: boolean;
  menu: boolean;
  menuMobile: boolean;
  menuInstant: boolean;
  dark: boolean;
  vaultsRevealed: boolean;
  vaultsSettled: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();

const initialFlags: Flags = {
  loaded: false,
  menu: false,
  menuMobile: false,
  menuInstant: false,
  dark: false,
  vaultsRevealed: false,
  vaultsSettled: false,
};

export const store = {
  flags: { ...initialFlags } as Flags,

  setFlag<K extends keyof Flags>(key: K, value: Flags[K]) {
    if (!(key in store.flags) || store.flags[key] === value) return;
    store.flags = { ...store.flags, [key]: value };
    listeners.forEach((l) => l());
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Vue `watch(() => store.flags[key], cb, { immediate })` equivalent for non-React code. */
export function watchFlag<K extends keyof Flags>(
  key: K,
  cb: (value: Flags[K], prev: Flags[K] | undefined) => void,
  { immediate = false } = {},
) {
  let prev: Flags[K] | undefined = store.flags[key];
  if (immediate) cb(prev, undefined);
  return store.subscribe(() => {
    const next = store.flags[key];
    if (next !== prev) {
      const old = prev;
      prev = next;
      cb(next, old);
    }
  });
}

export function useFlag<K extends keyof Flags>(key: K): Flags[K] {
  return useSyncExternalStore(
    store.subscribe,
    () => store.flags[key],
    () => initialFlags[key],
  );
}
