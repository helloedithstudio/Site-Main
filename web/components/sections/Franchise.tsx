import { home } from "@/lib/content";
import Button from "../ui/Button";
import SmartLink from "../ui/SmartLink";

const item = home.franchise;

// One paragraph, three lead-ins: the ladder from Catalyst to Maintainer to a venture, in the words the three boxes used.
const body = item.items.map((box) => `<strong>${box.title}.</strong> ${box.text}`).join(" ");
const [start, ...more] = item.items;

// "Build under the edith name": a left-aligned statement over one wide panel of the footer marble, which WebGL draws
// into [data-js="gl-marble-footer"]. No boxes; a scrim keeps the text readable over the veins.
export default function Franchise() {
  return (
    <section id="studio" data-quick-link="Studio" className="relative pb-65 s:pb-180 z-2">
      <div className="edith-path" data-js="gl-marble-footer">
        <div className="edith-path__inner site-max px-20 s:px-0">
          <div className="edith-rule edith-rule--short" />
          <h2 className="edith-path__h2" dangerouslySetInnerHTML={{ __html: item.texts.title }} />
          {item.texts.subtitle ? <p className="edith-path__stand" dangerouslySetInnerHTML={{ __html: item.texts.subtitle }} /> : null}
          <p className="edith-lit edith-path__body" dangerouslySetInnerHTML={{ __html: body }} />
          <div className="edith-path__actions">
            <Button item={start.link} />
            {more.map((box) => (
              <SmartLink key={box.id} item={box.link} className="edith-more">
                {box.linkLabel}
              </SmartLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
