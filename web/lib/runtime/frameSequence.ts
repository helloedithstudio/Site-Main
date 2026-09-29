// A pre-rendered sequence played by scroll, drawn to a canvas: the way Apple's product pages animate. There is no video
// decoder in the loop, so scrubbing never lags or stutters on seek. Shared by Beliefs and the Showcase films.
//
// Loading: frames arrive a few at a time in passes (first and last, then every 8th, 4th, 2nd, the rest), once the
// sequence is near the viewport or a little after the page settles, whichever comes first. On a slow or data-saving
// connection only proximity starts it.
//
// Decoding: each frame is kept as its compressed bytes (a Blob of about 20 to 80 KB). The frames around the playhead
// are decoded ahead of time into ImageBitmaps, which browsers do off the main thread for a Blob (for an <img> they do
// it on the main thread, which stutters a fast scrub on a slow device). Only a small window stays decoded, so a long
// sequence never holds hundreds of megabytes of pixels. The picture is always the decoded frame nearest the playhead;
// when a fast scrub outruns the decoder it lags by a frame or two and catches up, instead of the page stalling. The
// frame above fades in over the one below by the fractional remainder, so short sequences still scrub smoothly.
//
// Browsers without createImageBitmap or fetch fall back to plain images, decoded by the browser when drawn.

export type FrameSequenceOptions = {
  count: number;
  src: (i: number) => string;
  canvas: HTMLCanvasElement;
  /** Size of the frames as stored. */
  frame: { w: number; h: number };
  /** "height": fit to the canvas height and centre (a tall crop). "cover": fill the canvas, cropping around `focus`. */
  fit?: "height" | "cover";
  /** The point of the frame (0 to 1 each way) that stays in the same relative place when "cover" crops. */
  focus?: { x: number; y: number };
  concurrency?: number;
  /** Start fetching this long after creation even when nothing is near (ms). */
  idleStart?: number;
  /** Start fetching when this element comes within `nearMargin` of the viewport. */
  near?: Element | null;
  nearMargin?: string;
  /** Decoded frames kept on each side of the playhead. */
  window?: number;
  /** Called once, when the first frame has been drawn. */
  onFirstDraw?: () => void;
};

export type FrameSequence = {
  /** Draw frame `target` (fractional: the next frame fades in by the remainder). */
  render(target: number, force?: boolean): void;
  /** Canvas size in CSS pixels, drawn at `dpr` device pixels per CSS pixel. */
  resize(width: number, height: number, dpr?: number): void;
  /** Start fetching now. */
  start(): void;
  destroy(): void;
  /** How many frames have arrived. */
  readonly loaded: number;
};

type Conn = { saveData?: boolean; effectiveType?: string };

const DECODERS = 4;

export function createFrameSequence(o: FrameSequenceOptions): FrameSequence {
  const { count, canvas, frame } = o;
  const fit = o.fit ?? "height";
  const focus = o.focus ?? { x: 0.5, y: 0.5 };
  const concurrency = o.concurrency ?? 4;
  const offThread = typeof createImageBitmap === "function" && typeof fetch === "function";
  const span = Math.max(4, o.window ?? 8);
  // decoded frames kept at most: the window, plus a few stale ones so a jump never leaves nothing to draw
  const keep = span * 2 + 6;

  const blobs: (Blob | undefined)[] = [];
  const images: (HTMLImageElement | undefined)[] = [];
  const bitmaps = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  let current = 0;
  let direction = 1;
  let drawn = "";
  let disposed = false;
  let loaded = 0;
  let firstDrawn = false;

  const ready = (i: number) => (offThread ? !!blobs[i] : (images[i]?.naturalWidth ?? 0) > 0);
  const drawable = (i: number) => (offThread ? bitmaps.has(i) : ready(i));
  const nearestDrawable = (i: number) => {
    if (drawable(i)) return i;
    for (let d = 1; d < count; d++) {
      if (i - d >= 0 && drawable(i - d)) return i - d;
      if (i + d < count && drawable(i + d)) return i + d;
    }
    return -1;
  };
  const source = (i: number): CanvasImageSource => (offThread ? bitmaps.get(i)! : images[i]!);

  const place = () => {
    const { width, height } = canvas;
    if (fit === "height") {
      const s = height / frame.h;
      const w = frame.w * s;
      return { x: (width - w) / 2, y: 0, w, h: height };
    }
    const s = Math.max(width / frame.w, height / frame.h);
    const w = frame.w * s;
    const h = frame.h * s;
    return { x: focus.x * (width - w), y: focus.y * (height - h), w, h };
  };

  const draw = (a: number, b: number, mix: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = place();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source(a), r.x, r.y, r.w, r.h);
    if (b >= 0) {
      ctx.globalAlpha = mix;
      ctx.drawImage(source(b), r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }
    if (!firstDrawn) {
      firstDrawn = true;
      o.onFirstDraw?.();
    }
  };

  const render = (target: number, force = false) => {
    const f = Math.min(count - 1, Math.max(0, target));
    if (f !== current) direction = f > current ? 1 : -1;
    current = f;
    const lo = Math.floor(f);
    const mix = f - lo;
    const a = nearestDrawable(lo);
    if (a >= 0) {
      const up = Math.min(count - 1, lo + 1);
      const b = mix > 0.004 && a === lo && up !== lo && drawable(up) ? up : -1;
      const key = `${a}:${b}:${Math.round(mix * 32)}:${canvas.width}x${canvas.height}`;
      if (key !== drawn || force) {
        drawn = key;
        draw(a, b, mix);
      }
    }
    if (offThread) decodeAround();
  };

  /** Decode the frames around the playhead (nearest first, leaning the way the visitor scrolls); drop the farthest. */
  const decodeAround = () => {
    if (disposed) return;
    const centre = Math.round(current);
    const lo = Math.max(0, centre - span);
    const hi = Math.min(count - 1, centre + span);
    for (let d = 0; d <= span && decoding.size < DECODERS; d++) {
      for (const i of d === 0 ? [centre] : [centre + d * direction, centre - d * direction]) {
        if (i < lo || i > hi || bitmaps.has(i) || decoding.has(i) || !blobs[i]) continue;
        decoding.add(i);
        createImageBitmap(blobs[i]!)
          .then((bmp) => {
            decoding.delete(i);
            if (disposed) {
              bmp.close();
              return;
            }
            bitmaps.set(i, bmp);
            while (bitmaps.size > keep) {
              let far = -1;
              for (const k of bitmaps.keys()) if (far < 0 || Math.abs(k - current) > Math.abs(far - current)) far = k;
              bitmaps.get(far)!.close();
              bitmaps.delete(far);
            }
            // draw it at once if it is (or blends with) the frame the visitor is looking at
            if (Math.abs(i - current) < 2 || !firstDrawn) render(current, true);
            else decodeAround();
          })
          .catch(() => decoding.delete(i));
        if (decoding.size >= DECODERS) break;
      }
    }
  };

  // Loading order: both ends first, then ever finer passes over the whole sequence.
  const order: number[] = [0, count - 1];
  const queued = new Set<number>(order);
  for (const stride of [8, 4, 2, 1]) {
    for (let i = 0; i < count; i += stride) {
      if (!queued.has(i)) {
        queued.add(i);
        order.push(i);
      }
    }
  }
  let next = 0;
  let inFlight = 0;
  const arrived = () => {
    loaded++;
    if (offThread) decodeAround();
    else render(current, true);
  };
  const pump = () => {
    while (!disposed && inFlight < concurrency && next < order.length) {
      const i = order[next++];
      inFlight++;
      const settle = () => {
        inFlight--;
        if (!disposed) pump();
      };
      if (offThread) {
        fetch(o.src(i))
          .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
          .then((blob) => {
            if (disposed) return;
            blobs[i] = blob;
            arrived();
          })
          .catch(() => undefined)
          .finally(settle);
      } else {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!disposed) arrived();
          settle();
        };
        img.onerror = () => {
          images[i] = undefined;
          settle();
        };
        images[i] = img;
        img.src = o.src(i);
      }
    }
  };

  let started = false;
  const start = () => {
    if (started || disposed) return;
    started = true;
    observer?.disconnect();
    pump();
  };
  const observer =
    typeof IntersectionObserver === "undefined" || !o.near
      ? null
      : new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), {
          rootMargin: o.nearMargin ?? "300% 0px 300% 0px",
        });
  if (o.near) observer?.observe(o.near);
  const conn = (navigator as Navigator & { connection?: Conn }).connection;
  const lean = !!conn && (!!conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType ?? ""));
  const idleTimer = !lean && o.idleStart !== undefined ? window.setTimeout(start, o.idleStart) : 0;
  if (!observer && !idleTimer) start();

  return {
    render,
    resize(width, height, dpr = 1) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      render(current, true);
    },
    start,
    destroy() {
      disposed = true;
      observer?.disconnect();
      window.clearTimeout(idleTimer);
      images.forEach((img) => {
        if (img) img.onload = img.onerror = null;
      });
      bitmaps.forEach((b) => b.close());
      bitmaps.clear();
      blobs.length = 0;
    },
    get loaded() {
      return loaded;
    },
  };
}
