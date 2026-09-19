import { home } from "@/lib/content";
import Texts from "../ui/Texts";
import Points from "../ui/Points";

// "The community decides": the spinning emblem (a stand-in for now) is WebGL, drawn into
// [data-js="gl-emblem"] and clipped by [data-js="gl-emblem-mask"].
export default function Decisions() {
  return (
    <section id="decisions" data-quick-link="Decisions" className="border-t border-brown-dark relative z-2">
      <div className="site-max --full grid grid-cols-1 s:grid-cols-2 s:divide-x s:divide-brown-dark">
        <div className="relative flex justify-center items-center" data-js="gl-emblem-mask">
          <div
            className="relative aspect-[2/4] s:aspect-[470/567] w-full max-w-[20rem] s:max-w-[35rem] sm:max-w-[47rem]"
            data-js="gl-emblem"
          />
        </div>
        <div className="relative flex justify-center site-margin pt-25 pb-40 s:pt-180 s:pb-180">
          <Texts item={home.decisions.texts} className="w-full s:max-w-[50rem]">
            <Points points={home.decisions.list} className="mt-20" />
          </Texts>
        </div>
      </div>
    </section>
  );
}
