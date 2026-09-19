// "Six hubs, one server": the hub table over the WebGL archway hallway.

import { home } from "@/lib/content";
import Texts from "../ui/Texts";

const { columns, rows } = home.hubs;

export default function Hubs() {
  return (
    <section
      id="hubs"
      data-quick-link="Hubs"
      className="border-t border-brown-dark pb-65 s:pb-180 relative overflow-hidden z-2"
      data-js="gl-hallway-mask"
    >
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-black to-transparent" />
      <div className="relative site-max --l z-2">
        <div className="relative max-s:flex max-s:flex-col s:stack s:items-start px-20 s:px-0">
          <div className="relative aspect-[3075/2075] max-s:-mx-100" data-js="gl-hallway" />
          <div className="relative flex flex-col m:flex-row m:items-center m:gap-x-[18rem] s:pt-[33%] -mx-40 s:mx-0 pl-40 s:pl-0">
            <div className="relative flex-1 min-w-0 z-2 overflow-x-auto">
              <div className="min-w-[57rem] flex flex-col gap-y-10 s:gap-y-15 pr-40 s:pr-0">
                <div className="grid edith-hubs gap-x-8">
                  {columns.map((c) => (
                    <div
                      key={c}
                      className="bg-black/50 border-t border-x border-brown-dark rounded-t-4 px-12 py-10 max-s:!text-10 type-caption uppercase text-white text-center"
                    >
                      {c}
                    </div>
                  ))}
                </div>
                {rows.map((r) => (
                  <div key={r.hub} className="grid edith-hubs gap-x-8 bg-black/50 border border-brown-dark rounded-4">
                    <div className="px-12 py-12 flex items-center max-s:!text-10 type-caption uppercase text-white">{r.hub}</div>
                    <div className="px-12 py-12 flex items-center max-s:!text-10 type-caption text-white/60">{r.what}</div>
                    <div className="px-12 py-12 flex items-center justify-center max-s:!text-10 type-caption text-white text-center">
                      {r.start}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Texts item={home.hubs.texts} className="relative z-2 w-full s:max-w-[50rem] pr-40 s:pr-0 mt-30 m:mt-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
