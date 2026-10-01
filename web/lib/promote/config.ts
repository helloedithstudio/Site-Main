// Settings for promotion from Catalyst to Maintainer, on top of the join flow's settings (lib/join/config.ts). Read from
// environment variables on the server only. Nothing here is needed for the join flow itself: if these are missing, the join
// flow keeps working and the promotion routes simply say they are not set up.

import { joinConfig, type JoinConfig } from "../join/config";

export type PromoteConfig = JoinConfig & {
  /** The Discord application's public key (64 hex characters): proves a request really came from Discord. */
  publicKey: string;
  roleMaintainer: string;
  /** A private channel where Friday posts nominations and logs every promotion. */
  channelPromotions: string;
  /** Discord user ids allowed to promote, demote, credit and list. Only these people can press the nomination buttons. */
  promoterIds: string[];
  /** A Catalyst must have been one for at least this many days to be nominated. */
  minDays: number;
  /** Points needed for a nomination (see lib/promote/score.ts). */
  minPoints: number;
  /** GitHub organisations whose merged pull requests count. */
  orgs: string[];
  /** Optional: raises GitHub's search limit from 10 to 30 requests a minute. Needs no scope. */
  githubToken?: string;
};

const REQUIRED = ["DISCORD_PUBLIC_KEY", "DISCORD_ROLE_MAINTAINER", "DISCORD_CHANNEL_PROMOTIONS", "PROMOTER_IDS"] as const;

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const whole = (v: string | undefined, fallback: number, min: number) => {
  const n = Number(v);
  return v?.trim() && Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
};

export function promoteConfig(env: Record<string, string | undefined> = process.env): { ok: true; cfg: PromoteConfig } | { ok: false; missing: string[] } {
  const base = joinConfig(env);
  const missing: string[] = base.ok ? [] : [...base.missing];
  for (const k of REQUIRED) if (!env[k]?.trim()) missing.push(k);
  const key = env.DISCORD_PUBLIC_KEY?.trim() ?? "";
  if (key && !/^[0-9a-f]{64}$/i.test(key)) missing.push("DISCORD_PUBLIC_KEY (64 hex characters, from the Discord developer portal)");
  const promoters = list(env.PROMOTER_IDS);
  if (env.PROMOTER_IDS?.trim() && promoters.some((p) => !/^\d{5,25}$/.test(p))) missing.push("PROMOTER_IDS (comma separated numeric Discord user ids)");
  if (missing.length || !base.ok) return { ok: false, missing };
  return {
    ok: true,
    cfg: {
      ...base.cfg,
      publicKey: key.toLowerCase(),
      roleMaintainer: env.DISCORD_ROLE_MAINTAINER!.trim(),
      channelPromotions: env.DISCORD_CHANNEL_PROMOTIONS!.trim(),
      promoterIds: promoters,
      minDays: whole(env.PROMOTE_MIN_DAYS, 30, 0),
      minPoints: whole(env.PROMOTE_MIN_POINTS, 8, 1),
      orgs: list(env.PROMOTE_GITHUB_ORGS).length ? list(env.PROMOTE_GITHUB_ORGS) : ["helloedithstudio", "Edith-Studio"],
      githubToken: env.GITHUB_TOKEN?.trim() || undefined,
    },
  };
}
