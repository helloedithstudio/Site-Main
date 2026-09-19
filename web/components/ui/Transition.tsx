"use client";

// Minimal React port of Vue 3's <Transition> semantics used by the original site:
//  • CSS mode: `${name}-enter-from/active/to` and `${name}-leave-from/active/to` classes
//  • JS mode:  onEnter(el, done) / onLeave(el, done) hooks (css: false)
//  • mode="out-in" or simultaneous (Vue's default)
// <TransitionSwitch> animates a single keyed child being replaced; <TransitionPresence>
// animates a v-if (unmount) or v-show (`keepMounted`, display:none) child.

import { cloneElement, useLayoutEffect, useRef, useState, type ReactElement, type Ref } from "react";

type Hook = (el: HTMLElement, done: () => void) => void;

export type TransitionProps = {
  name?: string;
  css?: boolean;
  onEnter?: Hook;
  onLeave?: Hook;
};

const noop = () => {};
const nextFrame = (cb: () => void) => requestAnimationFrame(() => requestAnimationFrame(cb));

function transitionTimeout(el: HTMLElement) {
  const style = getComputedStyle(el);
  const toMs = (s: string) => Number(s.trim().slice(0, -1).replace(",", ".")) * 1000;
  const durations = style.transitionDuration.split(",").map(toMs);
  const delays = style.transitionDelay.split(",").map(toMs);
  return Math.max(0, ...durations.map((d, i) => d + (delays[i] ?? delays[0] ?? 0)));
}

function whenTransitionEnds(el: HTMLElement, resolve: () => void) {
  const timeout = transitionTimeout(el);
  if (!timeout) return resolve();
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    el.removeEventListener("transitionend", onEnd);
    resolve();
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.target === el) end();
  };
  el.addEventListener("transitionend", onEnd);
  setTimeout(end, timeout + 1);
}

function runEnter(el: HTMLElement, { name = "v", css = true, onEnter }: TransitionProps, finish: () => void) {
  const from = `${name}-enter-from`;
  const active = `${name}-enter-active`;
  const to = `${name}-enter-to`;
  if (css) el.classList.add(from, active);
  let finished = false;
  const resolve = () => {
    if (finished) return;
    finished = true;
    if (css) el.classList.remove(from, to, active);
    finish();
  };
  const explicit = !!onEnter && onEnter.length > 1;
  onEnter?.(el, resolve);
  if (!css) {
    if (!explicit) resolve();
    return;
  }
  nextFrame(() => {
    if (finished) return;
    el.classList.remove(from);
    el.classList.add(to);
    if (!explicit) whenTransitionEnds(el, resolve);
  });
}

function runLeave(el: HTMLElement, { name = "v", css = true, onLeave }: TransitionProps, finish: () => void) {
  const from = `${name}-leave-from`;
  const active = `${name}-leave-active`;
  const to = `${name}-leave-to`;
  let finished = false;
  const resolve = () => {
    if (finished) return;
    finished = true;
    if (css) el.classList.remove(from, active, to);
    finish();
  };
  const explicit = !!onLeave && onLeave.length > 1;
  if (css) {
    el.classList.add(from);
    void document.body.offsetHeight; // force reflow, like Vue
    el.classList.add(active);
  }
  onLeave?.(el, resolve);
  if (!css) {
    if (!explicit) resolve();
    return;
  }
  nextFrame(() => {
    if (finished) return;
    el.classList.remove(from);
    el.classList.add(to);
    if (!explicit) whenTransitionEnds(el, resolve);
  });
}

type Item = { uid: string; key: string; element: ReactElement; leaving: boolean };

let uidCounter = 0;
const makeItem = (element: ReactElement): Item => ({
  uid: `t${uidCounter++}`,
  key: String(element.key),
  element,
  leaving: false,
});

/** Vue <Transition> around a single child whose `key` changes. */
export function TransitionSwitch({
  children,
  mode,
  ...props
}: TransitionProps & { children: ReactElement; mode?: "out-in" }) {
  const key = String(children.key);
  const [items, setItems] = useState<Item[]>(() => [makeItem(children)]);
  const nodes = useRef(new Map<string, HTMLElement>());
  const pending = useRef(new Set<string>()); // uids waiting for their enter hook
  const started = useRef(new Set<string>()); // uids whose leave already started
  const propsRef = useRef(props);
  propsRef.current = props;
  const latest = useRef(children);
  latest.current = children;

  // derive the next state during render (React's "adjust state on prop change" pattern)
  const current = items.find((i) => i.key === key && !i.leaving);
  if (!current) {
    const needsLeave = items.some((i) => !i.leaving);
    const shouldPush = mode !== "out-in" || items.length === 0;
    if (needsLeave || shouldPush) {
      const next = items.map((i) => (i.leaving ? i : { ...i, leaving: true }));
      if (shouldPush) {
        const item = makeItem(children);
        pending.current.add(item.uid);
        next.push(item);
      }
      setItems(next);
    }
  } else if (current.element !== children) {
    setItems(items.map((i) => (i === current ? { ...i, element: children } : i)));
  }

  useLayoutEffect(() => {
    items.forEach((item) => {
      const el = nodes.current.get(item.uid);
      if (!el) return;
      if (item.leaving) {
        if (started.current.has(item.uid)) return;
        started.current.add(item.uid);
        runLeave(el, propsRef.current, () => {
          nodes.current.delete(item.uid);
          started.current.delete(item.uid);
          setItems((prev) => {
            const rest = prev.filter((i) => i.uid !== item.uid);
            const wanted = String(latest.current.key);
            if (mode === "out-in" && !rest.some((i) => i.leaving) && !rest.some((i) => i.key === wanted)) {
              const next = makeItem(latest.current);
              pending.current.add(next.uid);
              rest.push(next);
            }
            return rest;
          });
        });
      } else if (pending.current.has(item.uid)) {
        pending.current.delete(item.uid);
        runEnter(el, propsRef.current, noop);
      }
    });
  }, [items, mode]);

  return (
    <>
      {items.map((item) =>
        cloneElement(item.element as ReactElement<{ ref?: Ref<HTMLElement> }>, {
          key: item.uid,
          ref: (node: HTMLElement | null) => {
            if (node) nodes.current.set(item.uid, node);
          },
        }),
      )}
    </>
  );
}

/** Vue <Transition> around a v-if child (default) or a v-show child (`keepMounted`). */
export function TransitionPresence({
  show,
  keepMounted = false,
  children,
  ...props
}: TransitionProps & { show: boolean; keepMounted?: boolean; children: ReactElement }) {
  const [mounted, setMounted] = useState(show);
  const node = useRef<HTMLElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const first = useRef(true);
  const token = useRef(0);

  if (!keepMounted && show && !mounted) setMounted(true);

  useLayoutEffect(() => {
    const el = node.current;
    if (first.current) {
      first.current = false;
      if (keepMounted && el && !show) el.style.display = "none";
      return;
    }
    const id = ++token.current;
    if (show) {
      if (!el) return;
      el.style.display = "";
      runEnter(el, propsRef.current, noop);
    } else {
      if (!el) {
        if (!keepMounted) setMounted(false);
        return;
      }
      runLeave(el, propsRef.current, () => {
        if (id !== token.current) return;
        if (keepMounted) el.style.display = "none";
        else setMounted(false);
      });
    }
  }, [show, keepMounted]);

  if (!keepMounted && !mounted) return null;
  return cloneElement(children as ReactElement<{ ref?: Ref<HTMLElement> }>, {
    ref: (el: HTMLElement | null) => {
      node.current = el;
    },
  });
}
