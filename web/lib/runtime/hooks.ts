"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { getRuntime } from "./index";

export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Nuxt's <ClientOnly> — false during SSR and hydration, true once mounted. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

type ResizeSnapshot = { small: boolean; mouse: boolean };
const serverSnapshot: ResizeSnapshot = { small: false, mouse: true };
let cached: ResizeSnapshot = serverSnapshot;

function subscribe(onChange: () => void) {
  const { resize } = getRuntime();
  const cb = () => onChange();
  resize.add(cb);
  return () => resize.remove(cb);
}

function snapshot(): ResizeSnapshot {
  const { resize } = getRuntime();
  if (cached.small !== resize.small || cached.mouse !== resize.mouse) {
    cached = { small: resize.small, mouse: resize.mouse };
  }
  return cached;
}

/** Reactive `$resize.small` / `$resize.mouse` (only read after mount). */
export function useResizeFlags(): ResizeSnapshot {
  return useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
}
