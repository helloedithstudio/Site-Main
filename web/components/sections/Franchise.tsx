import { home } from "@/lib/content";
import Button from "../ui/Button";
import Box from "../ui/Box";

const item = home.franchise;

// "Build under the edith name": the three boxes sit over the footer marble,
// which WebGL draws into [data-js="gl-marble-footer"].
export default function Franchise() {
  return (
    <section id="studio" data-quick-link="Studio" className="relative pb-65 s:pb-180 z-2">
      <div className="relative">
        <div className="site-max flex flex-col items-center gap-y-20 text-center">
          <h2 className="type-h2 s:max-w-[45rem]" dangerouslySetInnerHTML={{ __html: item.texts.title }} />
          {item.texts.subtitle ? (
            <p className="type-body-lg text-white s:max-w-[60rem]" dangerouslySetInnerHTML={{ __html: item.texts.subtitle }} />
          ) : null}
          {item.texts.links ? (
            <div className="relative flex items-center gap-x-15 mt-5 z-2">
              {item.texts.links.map((link) => (
                <Button key={link.id} item={link} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative mt-50 px-20 s:px-0">
          <div
            className="grid grid-cols-1 s:grid-cols-3 divide-y s:divide-y-0 s:divide-x divide-brown-dark border-x s:border-x-0 border-y s:border-b-0 border-brown-dark relative z-2"
            data-js="gl-marble-footer"
          >
            {item.items.map((box) => (
              <Box key={box.id} item={box} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
