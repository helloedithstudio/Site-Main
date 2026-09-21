// Shared by the form page (browser) and the server. Keep this file free of imports so it is safe in both.

/** Hours a new member has to finish the Catalyst form. The server reads ONBOARDING_HOURS; set NEXT_PUBLIC_ONBOARDING_HOURS to match if it is ever changed. */
export const JOIN_HOURS = Number(process.env.NEXT_PUBLIC_ONBOARDING_HOURS) >= 2 ? Number(process.env.NEXT_PUBLIC_ONBOARDING_HOURS) : 24;

/**
 * The go-live switch for what the public pages say. The rules, privacy text, FAQ and home copy about the 24 hour Catalyst
 * form only appear when NEXT_PUBLIC_JOIN_LIVE is "true", so the site never promises a removal that is not running.
 * Set it at the same moment as ONBOARDING_DRY_RUN=false, then redeploy (it is fixed into the build).
 */
export const JOIN_LIVE = process.env.NEXT_PUBLIC_JOIN_LIVE === "true";

const wholeDays = (v: string | undefined) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/**
 * Minimum account ages in days (0 = no minimum). The site reads the same NEXT_PUBLIC values on the server, so the rule that is
 * enforced and the rule the public pages state can never differ. A change needs a redeploy.
 */
export const MIN_DISCORD_DAYS = wholeDays(process.env.NEXT_PUBLIC_JOIN_MIN_DISCORD_DAYS);
export const MIN_GITHUB_DAYS = wholeDays(process.env.NEXT_PUBLIC_JOIN_MIN_GITHUB_DAYS);
