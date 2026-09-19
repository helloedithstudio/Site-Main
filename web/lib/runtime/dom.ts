// DOM helpers shared by the original app (`sc`, `gj`, `mb`, `_j`).

export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  root.querySelector<T>(selector);

export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  [...root.querySelectorAll<T>(selector)];

export const rect = (el: Element) => el.getBoundingClientRect();

export const clamp = (min: number, max: number, value: number) => Math.min(Math.max(value, min), max);
