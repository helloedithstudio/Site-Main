// Who gets invited, reminded or removed. Pure: no network, no clock of its own, so it can be tested exactly.
//
// The rules exist to make a wrong removal very hard:
//  - bots, the server owner, people with an exempt role, people who already have the Catalyst role, and anyone who joined
//    before the system was switched on are never touched;
//  - a person is only ever removed if they were invited (they carry the Pending role), and they are only invited while at
//    least half the window is left. So everyone removed had at least half the window (12 hours of 24) of notice, even if
//    the scheduled job was down for a while;
//  - someone who was missed for longer than that is reported, not removed.

export type Member = { id: string; roles: string[]; joinedAt: string; bot: boolean; username: string };

export type PlanConfig = {
  roleCatalyst: string;
  rolePending: string;
  roleReminded?: string;
  rolesExempt: string[];
  ownerId?: string;
  startAt: Date | null;
  hours: number;
};

export type Plan = {
  invite: Member[];
  remind: Member[];
  kick: Member[];
  /** Joined after the start but were not invited in time: left alone, listed for a person to look at. */
  missed: Member[];
  skipped: number;
};

const HOUR = 3_600_000;

/** Reminder goes out when this share of the window is left (a quarter: 6 of 24 hours). */
export const REMIND_WHEN_LEFT = 0.25;

export function planSweep(members: Member[], now: Date, cfg: PlanConfig): Plan {
  const plan: Plan = { invite: [], remind: [], kick: [], missed: [], skipped: 0 };
  if (!cfg.startAt) return plan; // switched off until a start time is set
  const window = cfg.hours * HOUR;
  for (const m of members) {
    const joined = Date.parse(m.joinedAt);
    if (
      m.bot ||
      m.id === cfg.ownerId ||
      Number.isNaN(joined) ||
      joined < cfg.startAt.getTime() ||
      m.roles.includes(cfg.roleCatalyst) ||
      m.roles.some((r) => cfg.rolesExempt.includes(r))
    ) {
      plan.skipped++;
      continue;
    }
    const age = now.getTime() - joined;
    if (m.roles.includes(cfg.rolePending)) {
      if (age >= window) plan.kick.push(m);
      else if (cfg.roleReminded && !m.roles.includes(cfg.roleReminded) && window - age <= window * REMIND_WHEN_LEFT) plan.remind.push(m);
      else plan.skipped++;
    } else if (age <= window / 2) {
      plan.invite.push(m);
    } else {
      plan.missed.push(m);
    }
  }
  return plan;
}
