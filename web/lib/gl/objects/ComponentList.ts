type Component = { inert?: boolean; update?: () => void; resize?: () => void; destroy?: () => void };

/** Fans update / resize / destroy out to children, skipping inert trackers. */
export class ComponentList {
  components: Component[] = [];

  add(c: Component | undefined | null) {
    if (c) this.components.push(c);
  }

  #inert(c: Component) {
    return !!c?.inert;
  }

  destroy() {
    this.components.forEach((c) => {
      if (!this.#inert(c)) c?.destroy?.();
    });
    this.components = [];
  }

  update() {
    this.components.forEach((c) => {
      if (!this.#inert(c)) c?.update?.();
    });
  }

  resize() {
    this.components.forEach((c) => {
      if (!this.#inert(c)) c?.resize?.();
    });
  }
}
