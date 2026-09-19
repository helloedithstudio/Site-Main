"use client";

// Desktop socials drop-down next to "Launch App": hover (mouse) or tap to open;
// the icon tiles scale in with a stagger (Vue <Transition :css="false"> + v-show).

import { useRef } from "react";
import { gsap } from "@/lib/runtime/gsap";
import { store, useFlag } from "@/lib/runtime/store";
import { useResizeFlags } from "@/lib/runtime/hooks";
import ClientOnly from "./ui/ClientOnly";
import MenuToggle from "./MenuToggle";
import Social, { socials } from "./ui/Social";
import { TransitionPresence } from "./ui/Transition";

function Menu() {
  const { mouse } = useResizeFlags();
  const open = useFlag("menu");
  const items = useRef<HTMLDivElement[]>([]);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const defaults = { duration: 0.75, ease: "snappy" };

  const onEnter = (_el: HTMLElement, done: () => void) => {
    done();
    queueMicrotask(() => {
      tl.current?.kill();
      tl.current = gsap.timeline({ defaults }).fromTo(items.current, { scale: 0 }, { scale: 1, stagger: 0.035 });
    });
  };
  const onLeave = (_el: HTMLElement, done: () => void) => {
    tl.current?.kill();
    tl.current = gsap.timeline({ defaults }).to(items.current, { scale: 0, stagger: -0.035 }).call(done);
  };

  const hover = mouse
    ? { onMouseEnter: () => store.setFlag("menu", true), onMouseLeave: () => store.setFlag("menu", false) }
    : {};

  return (
    <div className="relative" {...hover}>
      <MenuToggle
        label="socials"
        flag="menu"
        onClick={mouse ? undefined : () => store.setFlag("menu", !store.flags.menu)}
      />
      <TransitionPresence show={open} keepMounted css={false} onEnter={onEnter} onLeave={onLeave}>
        <div
          className={`absolute top-80 right-0 before:absolute before:-inset-x-15 before:-top-100 before:-bottom-15 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          {socials.map((s, i) => (
            <div
              key={s.href}
              ref={(el) => {
                if (el) items.current[i] = el;
              }}
              className="flex items-center justify-center size-50 rounded-3 bg-black border border-brown-dark mt-[-1px] first:mt-0"
            >
              <Social id={s.id} href={s.href} aria-label={s.label} />
            </div>
          ))}
        </div>
      </TransitionPresence>
    </div>
  );
}

export default function SocialsMenu({ scopeAttrs }: { scopeAttrs?: Record<string, string> }) {
  return (
    <ClientOnly placeholder={scopeAttrs}>
      <Menu />
    </ClientOnly>
  );
}
