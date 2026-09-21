"use client";

// Footer in the style of Apple's: small print, a hairline, five columns of headed link groups, a second
// hairline and a legal row. Phones get one accordion per group. No logo or wordmark on purpose.

import { footer, type FooterGroup } from "@/lib/content";
import { useAccordion } from "@/lib/runtime/useAccordion";
import { brand } from "@/lib/brand";
import SmartLink from "./ui/SmartLink";
import { ARROW_PATH } from "./ui/Arrow";

const credit = { label: "Design: Griflan", href: "https://griflan.com" };
const groups: FooterGroup[] = footer.columns.flat();

function Columns() {
  return (
    <div className="edith-apf__cols">
      {footer.columns.map((column, i) => (
        <div key={i} className="edith-apf__col">
          {column.map((group) => (
            <section key={group.id} className="edith-apf__group" aria-labelledby={`apf-${group.id}`}>
              <h2 id={`apf-${group.id}`} className="edith-apf__title">
                {group.title}
              </h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.id}>
                    <SmartLink item={link} className="edith-apf__link" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}

function Accordions() {
  const { current, toggle, setPanel } = useAccordion();
  return (
    <ul className="edith-apf__acc">
      {groups.map((group, i) => (
        <li key={group.id} className="edith-apf__acc-item">
          <button
            className="edith-apf__acc-btn"
            aria-expanded={current === i}
            aria-controls={`apf-panel-${i}`}
            onClick={() => toggle(i)}
          >
            <span className="edith-apf__title">{group.title}</span>
            <span className={`edith-apf__chev${current === i ? " is-open" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 12 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="fill-current" d={ARROW_PATH} />
              </svg>
            </span>
          </button>
          <div id={`apf-panel-${i}`} ref={setPanel(i)} className="overflow-hidden h-0">
            <ul className="edith-apf__acc-links">
              {group.links.map((link) => (
                <li key={link.id}>
                  <SmartLink item={link} className="edith-apf__link" />
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  return (
    <footer className="edith-apf relative z-2" role="contentinfo">
      <div className="site-max --l">
        <div className="edith-apf__notes">
          {footer.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
        <div className="edith-apf__body">
          <div className="max-s:hidden">
            <Columns />
          </div>
          <div className="s:hidden">
            <Accordions />
          </div>
        </div>
        <div className="edith-apf__bar">
          <p className="edith-apf__copy">{`Copyright © ${new Date().getFullYear()} ${brand.name}. All rights reserved.`}</p>
          <ul className="edith-apf__legal">
            {footer.legal.map((link) => (
              <li key={link.id}>
                <SmartLink item={link} className="edith-apf__link edith-apf__link--legal" />
              </li>
            ))}
            <li>
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className="edith-apf__link edith-apf__link--legal">
                {credit.label}
              </a>
            </li>
          </ul>
          <p className="edith-apf__region">{brand.location}</p>
        </div>
      </div>
    </footer>
  );
}
