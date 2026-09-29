"use client";

import { useState } from "react";

export type FaqItem = { q: string; a: string };

/**
 * FaqList — Apple product-page accordion: hairline rows, a plus that folds
 * into a minus, answers that unfold on the 0fr → 1fr grid trick so no
 * heights are ever measured. One row open at a time.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-t border-hairline">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-6 text-left sm:py-7"
            >
              <span
                className={`text-title transition-colors duration-300 ${
                  isOpen ? "text-text-1" : "text-text-2"
                }`}
              >
                {item.q}
              </span>
              <span aria-hidden className="relative h-4 w-4 shrink-0">
                <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-text-3" />
                <span
                  className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-text-3 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: `translateX(-50%) scaleY(${isOpen ? 0 : 1})`,
                  }}
                />
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="max-w-[58ch] pb-7 text-body text-text-2">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="border-t border-hairline" />
    </div>
  );
}
