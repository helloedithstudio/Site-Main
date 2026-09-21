// Reads public GitHub profiles on the server, at build time and then once a day, so a person's name, picture and
// portfolio link appear from just their username. Runs in server components only; the browser never calls the API.
// Set GITHUB_TOKEN on the host to lift the API's 60 requests an hour limit (only needed for a long list).
// Everything that comes back is treated as untrusted: types are checked, hosts are checked, text is trimmed.

import type { Person, PersonEntry } from "./people";

type Profile = { login: string; name: string | null; avatar_url: string; html_url: string; blog: string | null };

const LOGIN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

/** Accepts "octocat", "@octocat" or a github.com profile URL; returns the username or null if it is not one. */
export function normaliseLogin(raw: string): string | null {
  let v = raw.trim().replace(/^@/, "");
  const m = v.match(/github\.com\/([^/?#\s]+)/i);
  if (m) v = m[1];
  return LOGIN.test(v) ? v : null;
}

/** Only plain http(s) websites are shown: a bare "example.com" gets https; credentials, emails, other schemes and junk are dropped. */
export function safeUrl(raw?: string | null): string | undefined {
  const v = raw?.trim();
  if (!v || v.length > 300) return undefined;
  if (/^(javascript|data|vbscript|file|blob|mailto|tel):/i.test(v)) return undefined;
  const hasScheme = /^https?:\/\//i.test(v);
  if (!hasScheme && (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || v.includes("@"))) return undefined;
  try {
    const u = new URL(hasScheme ? v : `https://${v}`);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

/** Discord usernames are 2 to 32 letters, digits, underscores or full stops. Anything else is dropped. */
function safeDiscord(raw?: string): string | undefined {
  const v = raw?.trim().replace(/^@/, "");
  return v && /^[a-z0-9._]{2,32}$/i.test(v) ? v : undefined;
}

async function profile(login: string): Promise<Profile | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "edith-site" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers,
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[github] ${login}: profile lookup returned ${res.status}, showing the username and default picture`);
      return null;
    }
    const j = (await res.json()) as Record<string, unknown>;
    if (typeof j.login !== "string" || typeof j.avatar_url !== "string" || typeof j.html_url !== "string") return null;
    // Pictures and profile links must stay on GitHub's own hosts, whatever the response says.
    if (!j.avatar_url.startsWith("https://avatars.githubusercontent.com/") || !j.html_url.startsWith("https://github.com/")) return null;
    return {
      login: j.login,
      name: typeof j.name === "string" ? j.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || null : null,
      avatar_url: j.avatar_url,
      html_url: j.html_url,
      blog: typeof j.blog === "string" ? j.blog : null,
    };
  } catch (e) {
    console.warn(`[github] ${login}: profile lookup failed (${e instanceof Error ? e.message : "unknown error"})`);
    return null;
  }
}

export async function resolvePeople(entries: PersonEntry[]): Promise<Person[]> {
  const seen = new Set<string>();
  const unique: (PersonEntry & { github: string })[] = [];
  for (const e of entries) {
    const login = normaliseLogin(e.github);
    if (!login) {
      console.warn(`[github] "${e.github}" is not a GitHub username, skipped`);
      continue;
    }
    if (seen.has(login.toLowerCase())) continue;
    seen.add(login.toLowerCase());
    unique.push({ ...e, github: login });
  }
  const out: Person[] = [];
  for (let i = 0; i < unique.length; i += 8) {
    const chunk = unique.slice(i, i + 8);
    const found = await Promise.all(chunk.map((e) => profile(e.github)));
    chunk.forEach((e, k) => {
      const p = found[k];
      const login = p?.login ?? e.github;
      out.push({
        login,
        name: e.name ?? p?.name ?? login,
        avatar: p ? `${p.avatar_url}${p.avatar_url.includes("?") ? "&" : "?"}s=160` : `https://github.com/${login}.png?size=160`,
        github: p?.html_url ?? `https://github.com/${login}`,
        portfolio: safeUrl(e.portfolio) ?? safeUrl(p?.blog),
        discord: safeDiscord(e.discord),
        role: e.role,
        note: e.note,
        interests: e.interests,
        joined: e.joined,
      });
    });
  }
  return out;
}
