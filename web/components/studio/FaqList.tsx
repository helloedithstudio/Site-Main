"use client";

import { useState } from "react";

export type FaqItem = { q: string; a: string };

// Scene 6 of the Studio page: hairline rows, a plus that folds into a minus, and answers that unfold on the 0fr to 1fr
// grid trick so no height is ever measured. One row is open at a time.
export function FaqList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="sp-faq-item">
            <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="sp-faq-q">
              <span className={`sp-title sp-faq-q-text${isOpen ? " is-open" : ""}`}>{item.q}</span>
              <span aria-hidden className="sp-faq-icon">
                <span className="sp-faq-icon-h" />
                <span
                  className="sp-faq-icon-v"
                  style={{ transform: `translateX(-50%) scaleY(${isOpen ? 0 : 1})` }}
                />
              </span>
            </button>
            <div className="sp-faq-panel" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
              <div>
                <p className="sp-body sp-t2 sp-faq-a">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="sp-faq-end" />
    </div>
  );
}
