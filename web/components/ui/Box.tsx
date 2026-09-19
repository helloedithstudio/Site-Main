"use client";

// Hover box of the "Become an expert" grid. On hover the title slides up, the copy
// un-clips from the centre and the CTA slides down (scoped styles in styles/scoped.css,
// keyed on data-v-5826c28f exactly like the original SFC).

import { useEffect, useRef } from "react";
import type { LinkItem } from "@/lib/content";
import { getRuntime } from "@/lib/runtime";
import SmartLink from "./SmartLink";

const scope = { "data-v-5826c28f": "" };

export default function Box({ item }: { item: { title: string; text: string; link: LinkItem | null; linkLabel: string } }) {
  const el = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { resize } = getRuntime();
    const update = () => {
      if (resize.small) return;
      el.current?.style.setProperty("--height", `${content.current!.offsetHeight}px`);
    };
    resize.add(update);
    return () => resize.remove(update);
  }, []);

  return (
    <article className="relative" {...scope}>
      <SmartLink
        ref={el}
        item={item.link}
        className="box relative s:h-[36rem] has-hover:stack --c has-not-hover:flex has-not-hover:flex-col items-center justify-center gap-y-15 has-hover:gap-y-0 text-center py-20 site-margin"
        {...scope}
      >
        <h3 className="box__item type-caption uppercase text-white" {...scope} dangerouslySetInnerHTML={{ __html: item.title }} />
        <div ref={content} className="box__content flex flex-col items-center justify-center" {...scope}>
          <div className="s:max-w-[30rem]" {...scope} dangerouslySetInnerHTML={{ __html: item.text }} />
        </div>
        <div className="box__item uline-double text-gold type-body-sm" {...scope} dangerouslySetInnerHTML={{ __html: item.linkLabel }} />
      </SmartLink>
    </article>
  );
}
