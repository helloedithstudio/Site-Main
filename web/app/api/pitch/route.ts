import { verifyPitch } from "@/lib/pitch";
import { maintainerEntries } from "@/lib/legion";
import { resolvePeople, safeUrl } from "@/lib/github";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

// The Showcase page is static; it asks here, with the token from its own address, who sent it and for whom. Anything
// that is not a genuine, unexpired link from a current Maintainer gets { ok: false } and the page stays as it is.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("p") ?? "";
  const claims = verifyPitch(process.env.PITCH_LINK_SECRET, token);
  if (!claims) return Response.json({ ok: false }, { headers });
  const entry = maintainerEntries.find((e) => e.github.toLowerCase() === claims.from.toLowerCase());
  if (!entry) return Response.json({ ok: false }, { headers });
  const [person] = await resolvePeople([entry]);
  if (!person) return Response.json({ ok: false }, { headers });
  return Response.json(
    {
      ok: true,
      from: {
        name: person.name,
        first: person.name.split(" ")[0],
        avatar: person.avatar,
        booking: safeUrl(entry.booking) ?? brand.booking,
      },
      for: claims.for,
    },
    { headers },
  );
}
