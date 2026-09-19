"use client";

// "Texts" block: h2 title, h3 subtitle, rich-text body and CTA buttons.
// All strings arrive pre-sanitized from lib/content.ts.

import type { ReactNode } from "react";
import type { LinkItem } from "@/lib/content";
import Button from "./Button";

export type TextsItem = {
  title?: string;
  subtitle?: string;
  text?: string;
  links?: LinkItem[];
  link?: LinkItem | null;
};

export default function Texts({
  item,
  className,
  rule,
  children,
}: {
  item: TextsItem;
  className?: string;
  /** Show the short Apple-style gradient rule above the title (highlight sections only). */
  rule?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`flex flex-col items-start gap-y-20${className ? ` ${className}` : ""}`}>
      {rule ? <div className="edith-rule edith-rule--short" /> : null}
      {item.title ? <h2 className="type-h2" dangerouslySetInnerHTML={{ __html: item.title }} /> : null}
      {item.subtitle ? <h3 className="type-body-lg text-white" dangerouslySetInnerHTML={{ __html: item.subtitle }} /> : null}
      {item.text ? <div className="txt" dangerouslySetInnerHTML={{ __html: item.text }} /> : null}
      {item.links?.length ? (
        <div className="flex items-center gap-x-15 mt-10">
          {item.links.map((link) => (
            <Button key={link.label} item={link} />
          ))}
        </div>
      ) : item.link ? (
        <Button item={item.link} className="s:mt-10" />
      ) : null}
      {children}
    </div>
  );
}
