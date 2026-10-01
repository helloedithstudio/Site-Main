// The password check for the routes that only the site's maintainer or a timer may call: the request must carry
// "Authorization: Bearer <CRON_SECRET>". Compared in constant time. Server only.

import { timingSafeEqual } from "node:crypto";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function cronAuthorised(req: Request, secret: string): boolean {
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  return !!given && !!secret && same(given, secret);
}
