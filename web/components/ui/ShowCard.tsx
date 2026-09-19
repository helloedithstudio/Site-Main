"use client";

// Card for the show-off carousel. The artwork is the original arches image; the card links out
// (Discord) in a new tab. A tap anywhere on the card is handled by DragCarousel through data-url,
// and the real <a> keeps it reachable from the keyboard.

import Media from "./Media";
import SimpleImage from "./SimpleImage";

export type ShowCardItem = { id: string; tag: string; title: string; text: string; link: { external?: string } };

export default function ShowCard({ card }: { card: ShowCardItem }) {
  const url = card.link.external ?? "";
  return (
    <article className="relative flex w-full">
      <div data-url={url} className="article-card group relative flex w-full">
        <div className="absolute inset-0 pointer-events-none z-2">
          <div className="article-card__outline absolute inset-0 has-hover:group-hover:-inset-15 border border-brown-dark rounded-5 z-2" />
          <div className="article-card__background absolute bg-black inset-0 s:-inset-15 overflow-hidden hidden has-hover:block z-1">
            <SimpleImage src="/article-background.jpg" className="absolute media-fill -inset-5" />
          </div>
        </div>
        <div className="relative flex flex-col flex-1 w-full bg-black s:p-15 pb-20 s:pb-30 rounded-5 border border-brown-dark z-2">
          <div className="relative aspect-[333/210] overflow-hidden">
            <div className="absolute -inset-2">
              <div className="article-card__media-mask absolute inset-0">
                <Media
                  src="/images/featured-image-default.jpg"
                  aspect={false}
                  className="transition-opacity duration-500 ease-out-expo has-hover:group-hover:opacity-50"
                />
              </div>
              <div className="absolute inset-2 flex items-center justify-center z-2">
                <div className="relative h-25 bg-white edith-tag transition-colors duration-300 ease-out rounded-3 type-caption uppercase text-black px-12 pt-[.1em]">
                  {card.tag}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-y-10 gap-y-12 mt-15 s:mt-25 px-15 s:px-10 sm:px-15 relative">
            <div className="flex flex-col transition-opacity duration-500 ease-out-expo has-hover:group-hover:opacity-50">
              <h3 className="type-body-lg max-w-[30rem]">{card.title}</h3>
            </div>
            <p className="type-body-xs max-w-[29.5rem]" dangerouslySetInnerHTML={{ __html: card.text }} />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="uline-double text-gold type-body-sm edith-cta"
              onClick={(e) => {
                // mouse and touch go through the carousel's tap handler; keyboard activation is native
                if (e.detail !== 0) e.preventDefault();
              }}
            >
              Join the Discord
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
