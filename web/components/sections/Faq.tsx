"use client";

import { home } from "@/lib/content";
import { useAccordion } from "@/lib/runtime/useAccordion";
import Button from "../ui/Button";
import SimpleImage from "../ui/SimpleImage";
import { ARROW_PATH } from "../ui/Arrow";

const item = home.faq;

export default function Faq() {
  const { current, toggle, setPanel } = useAccordion({ initial: 0 });

  return (
    <section id="faq" data-quick-link="FAQ" className="border-t border-brown-dark relative z-2">
      <div className="site-max pt-60 pb-120 s:py-230 flex flex-col s:flex-row s:items-start gap-x-30 sm:gap-x-80 gap-y-30">
        <div className="flex flex-col items-center s:items-start text-center s:text-left w-full s:max-w-[27.5rem] sm:max-w-[35rem]">
          <h2 className="type-h2" dangerouslySetInnerHTML={{ __html: item.title }} />
          {item.link ? <Button item={item.link} className="mt-30 hidden s:inline-flex" /> : null}
        </div>
        <ul className="flex-1">
          {item.items.map((faq, i) => (
            <li key={i} className="border-t border-brown-dark last:border-b">
              <button
                className="group w-full flex items-center justify-between s:pl-35 s:pr-15 py-15 s:py-25 gap-x-15 s:gap-x-40 text-left"
                aria-expanded={current === i}
                aria-controls={`faq-panel-${i}`}
                onClick={() => toggle(i)}
              >
                <span
                  className={`type-body-xs s:type-body-md transition-colors duration-300 ease-out has-hover:group-hover:text-gold${current === i ? " text-gold" : ""}`}
                  dangerouslySetInnerHTML={{ __html: faq.question }}
                />
                <span
                  className={`shrink-0 text-[1.4rem] transition-transform duration-500 ease-out-expo ${
                    current === i ? "scale-y-[-1] text-brown" : "text-gold"
                  }`}
                >
                  <svg className="min-w-8 s:min-w-12 h-auto" viewBox="0 0 12 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path className="fill-current" d={ARROW_PATH} />
                  </svg>
                </span>
              </button>
              <div id={`faq-panel-${i}`} ref={setPanel(i)} className="overflow-hidden h-0">
                <div className="relative bg-brown-deepest mb-40 px-15 s:px-35 py-20 s:py-40">
                  <div className="txt max-w-[70rem]" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  <SimpleImage
                    src="/images/saffron-art-1.png"
                    className="absolute bottom-0 right-30 aspect-[419/345] min-w-140 max-w-140 hidden s:block"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        {item.link ? <Button item={item.link} className="self-center s:hidden" /> : null}
      </div>
    </section>
  );
}
