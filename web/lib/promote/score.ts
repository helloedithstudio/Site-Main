// Who should be nominated for Maintainer. Pure: no network and no clock, so every rule can be tested exactly.
//
// A Catalyst is nominated when they have been one for long enough AND have earned enough points:
//   2 points for each pull request merged into an edith repository in the last 60 days (at most 5 count, so 10),
//   2 points for each credit note Kevin has logged in the last 90 days (at most 5 count, so 10).
// With the defaults (30 days, 8 points) that is four merged pull requests, or two and two credit notes, and so on.
// Time alone never nominates anyone, and neither does one big burst: the caps keep it about steady contribution.

export const POINTS_PER_PR = 2;
export const POINTS_PER_CREDIT = 2;
export const PR_CAP = 5;
export const CREDIT_CAP = 5;
/** How far back merged pull requests and credit notes count, in days. */
export const PR_WINDOW_DAYS = 60;
export const CREDIT_WINDOW_DAYS = 90;

export type Signals = { days: number; mergedPrs: number; credits: number };
export type Score = { points: number; prs: number; credits: number };

export function scoreOf(s: Pick<Signals, "mergedPrs" | "credits">): Score {
  const prs = Math.min(Math.max(0, Math.floor(s.mergedPrs)), PR_CAP) * POINTS_PER_PR;
  const credits = Math.min(Math.max(0, Math.floor(s.credits)), CREDIT_CAP) * POINTS_PER_CREDIT;
  return { points: prs + credits, prs, credits };
}

export type Verdict = { ok: boolean; score: Score; why: string };

export function eligibility(s: Signals, cfg: { minDays: number; minPoints: number }): Verdict {
  const score = scoreOf(s);
  if (s.days < cfg.minDays) return { ok: false, score, why: `only ${Math.floor(s.days)} of ${cfg.minDays} days as a Catalyst` };
  if (score.points < cfg.minPoints) return { ok: false, score, why: `${score.points} of ${cfg.minPoints} points` };
  return { ok: true, score, why: `${score.points} points after ${Math.floor(s.days)} days` };
}
