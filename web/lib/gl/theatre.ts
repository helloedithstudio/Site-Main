// Tuned material/animation values. The original project authored these in Theatre.js
// and shipped them as a static "staticOverrides" state; this is that state plus the
// tiny resolver the production bundle used instead of @theatre/core.

type RGBA = { r: number; g: number; b: number; a: number };

const sheets: Record<string, Record<string, Record<string, any>>> = {
  Webgl: {
    Clouds: {
      activeColor: { r: 0.9882352941176472, g: 0.8784313725490196, b: 0.8, a: 1 },
      baseColor: { r: 1, g: 1, b: 1, a: 1 },
      activeScale: { max: 2.3, min: 0.2 },
      scale: { max: 1.8, min: 0.2 },
      activeColorBoost: 1.4810126582278478,
      baseColorA: { r: 1, g: 1, b: 1, a: 1 },
      baseColorB: { r: 0.792156862745098, g: 0.7686274509803922, b: 0.7686274509803922, a: 1 },
      morphSpeed: 2.4050632911392418,
    },
    Drops: {
      baseColor: { r: 0.796078431372549, g: 0.796078431372549, b: 0.796078431372549, a: 1 },
      ringWidth: 0.37,
      fallDelay: 1.508860759493673,
      ringDuration: 10.01265822784809,
      ringDecay: 1,
    },
    Postprocessing: { bloomIntensity: 1.8354430379746862, bloomThreshold: 0.41772151898734217 },
    Background: { speed: 0.2099999999999993 },
    Test: { test: 6.2025316455696204 },
    "Spinning-emblem": { mouse: { x: 1.1607594936708856 } },
    "Spinning-coin": { mouse: { y: 1.1354430379746834, x: 0.5278481012658228 } },
    "Hero Marble": {
      timeFactorReveal: 0.16962025316455698,
      colorBoostReveal: 121,
      timeFactorBoost: 0.5,
      colorBoost: 18,
      colorB: { r: 1, g: 0, b: 0, a: 1 },
      colorA: { r: 1, g: 0, b: 0, a: 1 },
      mouse: { boost: 100, radius: 0.22531645569620273, strength: 0.2721518987341778 },
      maskSelection: { type: "image", id: "Green.png" },
    },
    "Spinning-emblem-model": { normalFactor: 0.29113924050632917, mouse: { x: 0.6797468354430379 } },
    "Spinning-coin-model": { normalFactor: 0.2911392405063292 },
    "Spinning-coin-model / Embers": {
      timeFactor: 1,
      colorA: { r: 1, g: 0, b: 0, a: 1 },
      colorB: { r: 1, g: 0, b: 0, a: 1 },
      colorC: { r: 1, g: 0, b: 0, a: 1 },
      spreadFactor: 0.9873417721518961,
      amount: 130,
      renderOrder: 0,
      size: 8,
      threshold: 0.65,
    },
    "Spinning-coin-model / Model": { noiseFactor: 0.5, normalFactor: 0.25, mouse: { x: 0, y: 1.5 } },
    "Spinning-emblem-model / Model": { noiseFactor: 0.5, normalFactor: 0.25, mouse: { y: 1.5, x: 0 } },
    // The edith sculptures took over those two slots, so they inherit the same tuned values.
    "Spinning-membership-model / Model": { noiseFactor: 0.5, normalFactor: 0.25, mouse: { x: 0, y: 1.5 } },
    "Spinning-decisions-model / Model": { noiseFactor: 0.5, normalFactor: 0.25, mouse: { y: 1.5, x: 0 } },
    "Spinning-membership-model / Embers": {
      timeFactor: 1,
      colorA: { r: 1, g: 0, b: 0, a: 1 },
      colorB: { r: 1, g: 0, b: 0, a: 1 },
      colorC: { r: 1, g: 0, b: 0, a: 1 },
      spreadFactor: 0.9873417721518961,
      amount: 130,
      renderOrder: 0,
      size: 8,
      threshold: 0.65,
    },
    "Footer Marble": {
      colorBoost: 18,
      colorBoostReveal: 100,
      timeFactorReveal: 0.24556962025316484,
      timeFactorBoost: 0.5,
      mouse: { radius: 0, strength: 0, boost: 0 },
    },
    Footer: {
      model: { rotation: 0.01251898734177218, shift: 0.259 },
      mouse: {
        radius: 0,
        strengthX: 2.050632911392404,
        strengthY: 3.425949367088608,
        rotationX: 0.1886075949367087,
        rotationY: 0.032341772151898686,
      },
      gradientTxt: { type: "image", id: "Test.png" },
    },
    "Marble / Rays": {
      intensity: 10,
      decayRate: 0.6392405063291142,
      clampMax: 1,
      saturation: 3.4886075949367084,
      offsetScale: 0.7278481012658236,
      mixFactor: 0.22911392405063305,
    },
    "Marble / Basic": { timeFactorReveal: 0.30379746835443067 },
  },
};

const projects: Record<string, typeof sheets> = { Home: sheets };

export const THEATRE = { projects: { home: "Home" }, sheets: { home: { webgl: "Webgl" } } } as const;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);

const toHex = ({ r, g, b, a }: RGBA) => {
  const h = (v: number) => ((v * 255) | 256).toString(16).slice(1);
  const alpha = h(a);
  return `#${h(r)}${h(g)}${h(b)}${alpha === "ff" ? "" : alpha}`;
};
export type Color = RGBA & { toString(): string };
const color = (c: RGBA): Color => ({ ...c, toString() { return toHex(this); } });
const rgba = (c: RGBA) => color({ r: clamp(c.r, 0, 1), g: clamp(c.g, 0, 1), b: clamp(c.b, 0, 1), a: clamp(c.a, 0, 1) });
const isRgba = (c: any) => !!c && ["r", "g", "b", "a"].every((k) => isNum(c[k]));

type Prop =
  | { type: "number"; default: number; range?: [number, number] }
  | { type: "rgba"; default: Color }
  | { type: "image"; default: { type: "image"; id?: string } }
  | { type: "compound"; props: Record<string, Prop>; default: Record<string, unknown> };

/** Theatre-style prop declarations (`types.number`, `types.rgba`, …). */
export const t = {
  number: (value: number, o: { range?: [number, number]; [k: string]: unknown } = {}): Prop => ({
    type: "number",
    default: value,
    range: o.range,
  }),
  rgba: (value: RGBA = { r: 0, g: 0, b: 0, a: 1 }): Prop => ({ type: "rgba", default: rgba(value) }),
  image: (id?: string, _o?: unknown): Prop => ({ type: "image", default: { type: "image", id } }),
  compound: (props: Record<string, Prop>): Prop => ({
    type: "compound",
    props,
    default: Object.fromEntries(Object.entries(props).map(([k, p]) => [k, p.default])),
  }),
};

function resolve(prop: Prop, value: any): any {
  switch (prop.type) {
    case "number":
      return isNum(value) ? (prop.range ? clamp(value, prop.range[0], prop.range[1]) : value) : prop.default;
    case "rgba":
      return isRgba(value) ? rgba(value) : prop.default;
    case "image":
      return value?.type === "image" && (typeof value.id == "string" || value.id == null) ? value : prop.default;
    case "compound":
      return Object.fromEntries(Object.entries(prop.props).map(([k, p]) => [k, resolve(p, value?.[k])]));
    default:
      return (prop as { default: unknown }).default;
  }
}

/** Resolve an object's values and invoke `onChange` once (values never change at runtime). */
export function theatreObject<T = any>(
  project: string,
  sheet: string,
  object: string,
  props: Record<string, Prop>,
  onChange: (values: T) => void = () => {},
) {
  const overrides = projects[project]?.[sheet]?.[object] ?? {};
  const values = Object.fromEntries(Object.entries(props).map(([k, p]) => [k, resolve(p, overrides[k])])) as T;
  onChange(values);
  const unsubscribe = () => {};
  return { unsubscribe, destroy: unsubscribe, conf: { value: values } };
}
