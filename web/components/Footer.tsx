"use client";

// Footer in the style of the STEM reference: a brand block and four mono-labelled columns, a hairline, one
// line of small print each side, and an oversized ghost wordmark clipped by the bottom edge.

import { footer } from "@/lib/content";
import { useAccordion } from "@/lib/runtime/useAccordion";
import Button, { DiscordIcon } from "./ui/Button";
import { brand } from "@/lib/brand";
import SmartLink from "./ui/SmartLink";
import Social, { socials } from "./ui/Social";
import { ARROW_PATH } from "./ui/Arrow";

type Menu = (typeof footer.menus)[number];

const credit = { label: "Design: Griflan", href: "https://griflan.com" };

function Cols({ nav, className }: { nav: Menu[]; className?: string }) {
  return (
    <div className={`flex-1 grid s:grid-cols-4 gap-x-40 relative${className ? ` ${className}` : ""}`}>
      {nav.map((menu) => (
        <div key={menu.id} className="flex flex-col gap-y-15">
          <span className="font-mono type-caption uppercase text-gold tracking-wider">{menu.title}</span>
          <ul className="flex flex-col gap-y-12">
            {menu.links.map((link) => (
              <li key={link.id}>
                <SmartLink item={link} className="type-caption uppercase uline" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Accordions({ nav, className, idPrefix }: { nav: Menu[]; className?: string; idPrefix: string }) {
  const { current, toggle, setPanel } = useAccordion();
  return (
    <ul className={`flex-1${className ? ` ${className}` : ""}`}>
      {nav.map((menu, i) => (
        <li key={menu.id} className="border-t border-brown-dark last:border-b">
          <button
            className="w-full flex items-center justify-between py-15 gap-x-15 text-left"
            aria-expanded={current === i}
            aria-controls={`${idPrefix}-${i}`}
            onClick={() => toggle(i)}
          >
            <span className="font-mono type-caption uppercase tracking-wider transition-colors duration-300 ease-out text-gold">
              {menu.title}
            </span>
            <span
              className={`shrink-0 text-[1.4rem] transition-transform duration-500 ease-out-expo ${
                current === i ? "scale-y-[-1] text-brown" : "text-gold"
              }`}
            >
              <svg className="min-w-8 h-auto" viewBox="0 0 12 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className="fill-current" d={ARROW_PATH} />
              </svg>
            </span>
          </button>
          <div id={`${idPrefix}-${i}`} ref={setPanel(i)} className="overflow-hidden h-0">
            <ul className="flex flex-col gap-y-10 mb-20 px-0 py-5">
              {menu.links.map((link) => (
                <li key={link.id}>
                  <SmartLink item={link} className="type-caption uppercase uline" />
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
    <footer className="relative bg-black text-white border-t border-brown-dark overflow-hidden z-2">
      <div className="site-max --l">
        <div className="pt-65 s:pt-100 flex flex-col s:flex-row s:items-start s:gap-x-100">
          <div className="edith-footer-brand flex flex-col items-start w-full shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/edith-logo.png" alt={brand.name} className="edith-footer-logo w-auto" />
            <p className="type-body-sm mt-20 mb-25">{footer.text}</p>
            <Button item={footer.link} iconRight={<DiscordIcon />} />
            <div className="flex items-center gap-x-30 mt-30">
              {socials.map((s) => (
                <Social key={s.id} id={s.id} href={s.href} aria-label={s.label} />
              ))}
            </div>
          </div>
          <div className="edith-footer-nav flex-1 flex flex-col">
            <Cols nav={footer.menus} className="max-s:hidden" />
            <Accordions nav={footer.menus} className="s:hidden" idPrefix="footer-nav" />
          </div>
        </div>
        <div className="mt-50 s:mt-100 pt-30 pb-30 border-t border-brown-dark flex flex-col s:flex-row s:items-start s:justify-between gap-y-10 type-caption uppercase text-brown">
          <div className="flex flex-col gap-y-10">
            <p>{`Copyright © ${new Date().getFullYear()} ${brand.name}. No token. No tracking.`}</p>
            <a href={credit.href} target="_blank" rel="noopener" className="uline edith-self-start">
              {credit.label}
            </a>
          </div>
          <p className="edith-smallprint">{footer.smallPrint}</p>
        </div>
      </div>
      <div className="edith-ghost" aria-hidden="true">
        {brand.name}
      </div>
    </footer>
  );
}
