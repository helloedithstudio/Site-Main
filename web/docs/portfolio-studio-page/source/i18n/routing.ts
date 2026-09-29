import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // next-intl defaults this to true, which sniffs Accept-Language and 307s the
  // request. Measured: `Accept-Language: de-AT` turned every canonical EN URL
  // into a redirect to /de — including the ones sitemap.xml declares as
  // hreflang="en". Google crawls locale-adaptive pages with an Accept-Language
  // header, so it was being told "this URL is English" and then handed German.
  // Off: the URL alone decides the locale, and the switcher stays explicit.
  localeDetection: false,
});
