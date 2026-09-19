import { home } from "@/lib/content";
import Texts from "../ui/Texts";
import StatsList from "../ui/StatsList";

// "Everyone starts as a Catalyst": the spinning coin (a stand-in for now) is drawn by WebGL into [data-js="gl-coin"],
// clipped by the stencil of [data-js="gl-coin-mask"].
export default function Membership() {
  return (
    <section id="membership" data-quick-link="Membership" className="relative z-2">
      <div className="site-max --full grid grid-cols-1 s:grid-cols-2 s:divide-x s:divide-brown-dark border-t border-brown-dark">
        <div className="col-span-1 relative flex justify-center site-margin pt-25 pb-40 s:py-335 max-s:order-2">
          <Texts item={home.membership.texts} className="s:max-w-[50rem]" rule>
            <StatsList items={home.membership.stats} className="mt-25 s:mt-40 border-y border-brown-dark" />
          </Texts>
        </div>
        <div className="col-span-1 flex justify-center items-center max-s:order-1" data-js="gl-coin-mask">
          <div
            className="relative aspect-[2/4] s:aspect-[3/4] w-full max-w-[20rem] s:max-w-[25rem] sm:max-w-[34.5rem]"
            data-js="gl-coin"
          />
        </div>
      </div>
    </section>
  );
}
