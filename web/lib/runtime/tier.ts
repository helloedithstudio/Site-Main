// How much of the Showcase a device gets. Every tier shows the same words and links; only the motion and the 3D change.
//
//   high  full films, the live scene at up to 2x pixel density with bloom, video on the monoliths
//   mid   lighter films, the live scene at 1x with no post effects, stills on the monoliths
//   low   no pinning or scrubbing at all: stills and a readable page (also everyone who asks for reduced motion)
//
// Decided once per visit. `?tier=high|mid|low` overrides it, for testing.

export type Tier = "high" | "mid" | "low";

type Nav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

let decided: Tier | null = null;

function forced(): Tier | null {
  const t = new URLSearchParams(window.location.search).get("tier");
  return t === "high" || t === "mid" || t === "low" ? t : null;
}

function webgl2(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    const ok = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/** The tier from what the browser says about itself (instant). */
export function baseTier(): Tier {
  const f = forced();
  if (f) return f;
  const nav = navigator as Nav;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  if (nav.connection?.saveData || /^(slow-2g|2g)$/.test(nav.connection?.effectiveType ?? "")) return "low";
  if (!webgl2()) return "low";
  const memory = nav.deviceMemory ?? 8; // Safari and Firefox do not say; assume a capable device and let the probe decide
  const cores = navigator.hardwareConcurrency || 4;
  if (memory < 4 || cores < 4 || nav.connection?.effectiveType === "3g") return "mid";
  // Phones and tablets start at mid: the portrait film is lighter and the scene runs at 1x.
  if (window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820) return memory >= 6 ? "high" : "mid";
  return "high";
}

/** Median frame time over `ms`, in milliseconds (the browser is otherwise idle during the preloader). */
export function probeFrames(ms = 900): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = [];
    let last = performance.now();
    const start = last;
    const step = (now: number) => {
      times.push(now - last);
      last = now;
      if (now - start < ms) requestAnimationFrame(step);
      else {
        times.sort((a, b) => a - b);
        resolve(times[Math.floor(times.length / 2)] ?? 16.7);
      }
    };
    requestAnimationFrame(step);
  });
}

/** The tier for this visit: the base tier, stepped down one if the device cannot hold a steady frame rate. */
export async function decideTier(): Promise<Tier> {
  if (decided) return decided;
  let t = baseTier();
  if (t !== "low" && !forced()) {
    const median = await probeFrames();
    // 60 Hz is 16.7 ms and 120 Hz is 8.3 ms; a median over 24 ms means the page is already struggling.
    if (median > 24) t = t === "high" ? "mid" : "low";
  }
  decided = t;
  document.documentElement.dataset.tier = t;
  return t;
}
