// Who can see which channel. Discord decides this from role permissions and each channel's permission overwrites, and the
// rules are easy to get wrong by hand, so this works it out the way Discord does and lays it out as a table: the four kinds of
// person (nobody-in-particular, Pending, Catalyst, Maintainer) against every channel. Pure: it is given the channels and
// roles, so the tests need no Discord. Server only.
//
// Discord's order, for "can this person view this channel?":
//   1. start from the @everyone role's permissions, plus every role the person has (their permissions are added together);
//   2. Administrator sees everything and ignores overwrites;
//   3. apply the channel's @everyone overwrite (remove what it denies, then add what it allows);
//   4. apply the channel's overwrites for the person's roles, all denies together and then all allows together.
// The channel's own overwrites are the final word. (A channel that is "synced" to its category simply carries a copy.)

import type { GuildChannel, GuildRole } from "./discord";

// Permissions are bit flags too big for an ordinary number, so they are BigInts. (Written as BigInt(...) calls because this
// project's TypeScript target does not allow the 1n literal form.)
const ZERO = BigInt(0);
const ADMINISTRATOR = BigInt(1) << BigInt(3);
const VIEW_CHANNEL = BigInt(1) << BigInt(10);
const EVERYTHING = (BigInt(1) << BigInt(64)) - BigInt(1);
const CATEGORY = 4;

export type Viewer = { name: string; roleIds: string[] };

export function permissionsFor(channel: Pick<GuildChannel, "permission_overwrites">, roles: GuildRole[], roleIds: string[], everyoneId: string): bigint {
  const perms = new Map(roles.map((r) => [r.id, BigInt(r.permissions || "0")]));
  let base = perms.get(everyoneId) ?? ZERO;
  for (const id of roleIds) base |= perms.get(id) ?? ZERO;
  if (base & ADMINISTRATOR) return EVERYTHING;
  const overwrite = (id: string) => channel.permission_overwrites.find((o) => o.type === 0 && o.id === id);
  const everyone = overwrite(everyoneId);
  if (everyone) base = (base & ~BigInt(everyone.deny)) | BigInt(everyone.allow);
  let allow = ZERO;
  let deny = ZERO;
  for (const id of roleIds) {
    const o = overwrite(id);
    if (o) {
      allow |= BigInt(o.allow);
      deny |= BigInt(o.deny);
    }
  }
  return (base & ~deny) | allow;
}

export const canView = (channel: GuildChannel, roles: GuildRole[], roleIds: string[], everyoneId: string) =>
  (permissionsFor(channel, roles, roleIds, everyoneId) & VIEW_CHANNEL) !== ZERO;

export type AuditRow = { id: string; name: string; category: string | null; sees: Record<string, boolean> };
export type Audit = { viewers: string[]; rows: AuditRow[]; problems: string[]; notes: string[] };

/**
 * `viewers` must be in this order: [nobody in particular, Pending, Catalyst, Maintainer]. A Maintainer also has the Catalyst role
 * (promotion keeps it), so their role list should include both.
 */
export function auditChannels(channels: GuildChannel[], roles: GuildRole[], viewers: Viewer[], everyoneId: string): Audit {
  const names = new Map(channels.filter((c) => c.type === CATEGORY).map((c) => [c.id, c.name]));
  const rows: AuditRow[] = channels
    .filter((c) => c.type !== CATEGORY)
    .sort((a, b) => (names.get(a.parent_id ?? "") ?? "").localeCompare(names.get(b.parent_id ?? "") ?? "") || a.name.localeCompare(b.name))
    .map((c) => ({
      id: c.id,
      name: c.name,
      category: c.parent_id ? (names.get(c.parent_id) ?? null) : null,
      sees: Object.fromEntries(viewers.map((v) => [v.name, canView(c, roles, v.roleIds, everyoneId)])),
    }));

  const [nobody, pending, catalyst, maintainer] = viewers.map((v) => v.name);
  const problems: string[] = [];
  const notes: string[] = [];
  const where = (r: AuditRow) => `#${r.name}${r.category ? ` (in ${r.category})` : ""}`;

  for (const r of rows) {
    const looksPrivate = /maintainer/i.test(r.name) || /maintainer/i.test(r.category ?? "");
    for (const who of [nobody, pending, catalyst]) {
      if (looksPrivate && r.sees[who]) problems.push(`${where(r)} looks like a Maintainer channel but ${who === nobody ? "anyone in the server" : `a ${who}`} can see it.`);
    }
    if (r.sees[catalyst] && !r.sees[maintainer]) problems.push(`${where(r)} is visible to Catalysts but not to Maintainers, which is the wrong way round.`);
    if (r.sees[pending] && !r.sees[catalyst]) notes.push(`${where(r)} is visible to Pending members but not to Catalysts (fine for a welcome or rules channel, odd for anything else).`);
  }
  const maintainerOnly = rows.filter((r) => r.sees[maintainer] && !r.sees[catalyst]);
  if (!maintainerOnly.length) problems.push("No channel is visible only to Maintainers, so a promotion would unlock nothing yet.");
  else notes.push(`${maintainerOnly.length} channel${maintainerOnly.length === 1 ? " is" : "s are"} for Maintainers only: ${maintainerOnly.map(where).join(", ")}.`);
  const open = rows.filter((r) => r.sees[nobody]);
  notes.push(`${open.length} channel${open.length === 1 ? "" : "s"} can be seen by anyone in the server, with no role at all: ${open.map(where).join(", ") || "none"}.`);

  for (const role of roles) {
    if ((BigInt(role.permissions || "0") & ADMINISTRATOR) !== ZERO && role.id !== everyoneId) notes.push(`The role "${role.name}" has Administrator, which sees every channel and ignores the rules above. That is expected for the bot and for staff, and a mistake for anything a member can hold.`);
  }
  return { viewers: viewers.map((v) => v.name), rows, problems, notes };
}

/** The same table as plain text, for a terminal. */
export function auditText(a: Audit): string {
  const width = Math.max(8, ...a.rows.map((r) => (r.category ? r.category.length + r.name.length + 4 : r.name.length + 1)));
  const head = "channel".padEnd(width) + a.viewers.map((v) => "  " + v.slice(0, 11).padEnd(11)).join("");
  const lines = a.rows.map((r) => `${(r.category ? `${r.category} / #${r.name}` : `#${r.name}`).padEnd(width)}${a.viewers.map((v) => "  " + (r.sees[v] ? "can see" : "-").padEnd(11)).join("")}`);
  return [head, ...lines, "", a.problems.length ? "PROBLEMS" : "No problems found.", ...a.problems.map((p) => "- " + p), "", "NOTES", ...a.notes.map((n) => "- " + n)].join("\n");
}
