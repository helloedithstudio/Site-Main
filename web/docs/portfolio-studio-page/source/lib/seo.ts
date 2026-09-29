import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Canonical + hreflang alternates that match the URLs actually served.
 * With localePrefix "as-needed", en lives at "/" and de at "/de" — a
 * naive "./" canonical resolves to the internal /en path, which 307s.
 * getPathname gives the real public path per locale.
 */
export function localeAlternates(locale: string, href: string) {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, getPathname({ locale: l, href })])
  );
  languages["x-default"] = getPathname({
    locale: routing.defaultLocale,
    href,
  });

  return {
    canonical: getPathname({ locale, href }),
    languages,
  };
}
