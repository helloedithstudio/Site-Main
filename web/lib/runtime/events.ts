// Global event bus (the Nuxt `$event` plugin).

export const EVENTS = {
  WEBGL_BEFORE_RENDER: "WEBGL:BEFORE:RENDER",
  WEBGL_AFTER_RENDER: "WEBGL:AFTER:RENDER",
  WEBGL_APP_LOADING: "WEBGL:APP:LOADING",
  WEBGL_APP_LOADED: "WEBGL:APP:LOADED",
  WEBGL_APP_READY: "WEBGL:APP:READY",
  THEATRE_SWAP_MATCAP: "THEATRE:SWAP:MATCAP",
  APP_TICK: "tick",
  APP_RESIZE: "resize",
  APP_SCROLL: "scroll",
  APP_MOUSE_MOVE: "MOUSE:MOVE",
  APP_MOUSE_DRAG: "MOUSE:DRAG",
} as const;

export type TickEvent = { y: number; time: number; ratio: number; still: boolean };
export type ScrollEvent = { y: number; direction: number };
export type ResizeEvent = { ww: number; wh: number; small: boolean; landscape: boolean };

type Handler = (...args: any[]) => void;
type Entry = { cb: Handler; priority: number };

export class EventBus {
  labels?: Record<string, string>;
  events: Record<string, Entry[]> = {};

  constructor({ labels }: { labels?: Record<string, string> } = {}) {
    this.labels = labels;
  }

  emit(name: string, ...args: any[]) {
    const list = this.events[name] || [];
    for (let i = 0, { length } = list; i < length; i++) list[i]?.cb(...args);
  }

  on(name: string, cb: Handler, priority = 0) {
    if (this.labels && !Object.values(this.labels).includes(name)) {
      console.warn(`The ${name} event doesn't exists on ${this.labels}`);
    }
    const entry = { cb, priority };
    if (this.events[name]) this.events[name].push(entry);
    else this.events[name] = [entry];
    this.events[name].sort((a, b) => a.priority - b.priority);
    return () => {
      this.events[name] = this.events[name]?.filter((e) => cb !== e.cb);
    };
  }

  off(name: string, cb: Handler) {
    this.events[name] = this.events[name]?.filter(({ cb: c }) => cb !== c);
  }

  once(name: string, cb: Handler, priority = 0) {
    const wrapped = (...args: any[]) => {
      cb(...args);
      this.off(name, wrapped);
    };
    this.on(name, wrapped, priority);
    return () => {
      this.off(name, cb);
    };
  }

  destroy() {
    this.events = {};
  }
}

export const events = new EventBus({ labels: EVENTS });
