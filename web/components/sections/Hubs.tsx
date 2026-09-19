// "Six hubs, one server": the Apple "highlights" pattern. A centred heading, then six cards, each with the
// gradient rule on top, the hub name, one line and the channels to start in.

import { home } from "@/lib/content";
import Button from "../ui/Button";

const { texts, cards } = home.hubs;

export default function Hubs() {
  return (
    <section id="hubs" data-quick-link="Hubs" className="relative border-t border-brown-dark z-2">
      <div className="relative site-max pt-65 s:pt-180 pb-40 edith-intro-pb flex flex-col items-center text-center gap-y-15 px-20 s:px-0">
        <div className="edith-rule edith-rule--short mb-20" />
        <h2 className="type-h2" dangerouslySetInnerHTML={{ __html: texts.title }} />
        <p className="type-body-lg text-white s:max-w-[60rem]" dangerouslySetInnerHTML={{ __html: texts.subtitle }} />
        <div className="txt s:max-w-[60rem]" dangerouslySetInnerHTML={{ __html: texts.text }} />
        <div className="flex items-center gap-x-15 mt-10">
          {texts.links.map((link) => (
            <Button key={link.label} item={link} />
          ))}
        </div>
      </div>
      <div className="relative site-max pb-65 s:pb-180">
        <ul className="edith-hubcards">
          {cards.map((card, i) => (
            <li key={card.id} className="edith-hubcard">
              <div className="edith-rule edith-hubcard__rule" />
              <span className="type-caption uppercase text-brown">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="type-h3 mt-15">{card.hub}</h3>
              <p className="type-body-md text-white mt-15">{card.what}</p>
              <div className="edith-hubcard__channels">
                {card.channels.map((c) => (
                  <span key={c} className="edith-ch edith-hubcard__chip">
                    {c}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
