"use client";

// Mounts the WebGL engine. The canvas wrapper is a viewport-sized box inside <main>
// that is translated by the scroll offset every tick, so it always covers the screen.

import { useEffect, useRef } from "react";
import { Gesture } from "@use-gesture/vanilla";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { TickEvent } from "@/lib/runtime/events";
import { glState } from "@/lib/gl/state";
import { Engine } from "@/lib/gl/Engine";

export default function GlCanvas({ page = "index" }: { page?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    glState.runtime = getRuntime();
    const follow = ({ y }: TickEvent) => {
      if (el.current) el.current.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    let engine: Engine | undefined;
    let gesture: Gesture | undefined;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      engine = new Engine({ wrapper: el.current!, canvas: canvas.current!, page });
      gesture = new Gesture(window, { onMove: (state) => events.emit(EVENTS.APP_MOUSE_MOVE, state) }, {});
      events.on(EVENTS.APP_TICK, follow);
    });

    return () => {
      cancelled = true;
      events.off(EVENTS.APP_TICK, follow);
      engine?.destroy();
      engine = undefined;
      gesture?.destroy();
      gesture = undefined;
    };
  }, [page]);

  return (
    <div ref={el} className="absolute top-0 inset-x-0 h-full-screen overflow-hidden">
      <canvas ref={canvas} />
    </div>
  );
}
