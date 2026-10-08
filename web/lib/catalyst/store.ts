// Catalyst registration storage adapter.
//
// Priority order (first one that is fully configured wins):
//   1. Supabase  — SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//      Writes to the existing public.catalysts table (server-only via service role key).
//      Postgres unique constraint on discord_id catches duplicates; error code 23505 → HTTP 409.
//   2. Upstash Redis — CATALYST_STORE_URL + CATALYST_STORE_TOKEN
//      (or the shared UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN pair)
//   3. JSON file — .catalyst-dev-store.json in the project root (local dev only, never deployed)
//
// To swap to another backend, implement CatalystStore and return it from getCatalystStore().

import type { CatalystPayload } from "./schema";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export type CatalystRecord = CatalystPayload & {
  id: string;
  createdAt: string; // ISO-8601
};

export interface CatalystStore {
  /** Returns the existing record for this Discord ID, or null if none. */
  findByDiscordId(discordId: string): Promise<CatalystRecord | null>;
  /**
   * Persist a new record.
   * Throws a `DuplicateError` if the Discord ID is already registered.
   */
  save(payload: CatalystPayload): Promise<CatalystRecord>;
}

/** Thrown by adapters when the Discord ID already exists in the store. */
export class DuplicateError extends Error {
  constructor() {
    super("This Discord ID is already registered as a Catalyst.");
    this.name = "DuplicateError";
  }
}

// ---------------------------------------------------------------------------
// Supabase adapter  (production — preferred)
// ---------------------------------------------------------------------------

// Row shape as it comes back from Supabase (snake_case columns).
type CatalystsRow = {
  id: string;
  name: string;
  discord_id: string;
  github_id: string;
  x_id: string;
  linkedin_id: string;
  portfolio_url: string;
  created_at: string;
};

function rowToRecord(row: CatalystsRow): CatalystRecord {
  return {
    id: row.id,
    name: row.name,
    discordId: row.discord_id,
    githubId: row.github_id,
    xId: row.x_id,
    linkedinId: row.linkedin_id,
    portfolioUrl: row.portfolio_url,
    createdAt: row.created_at,
  };
}

function supabaseStore(): CatalystStore {
  // Imported here so the module is never bundled for the browser.
  const { getSupabaseServerClient } = require("@/lib/supabase-server") as typeof import("@/lib/supabase-server");

  return {
    async findByDiscordId(discordId) {
      const sb = getSupabaseServerClient();
      const { data, error } = await sb
        .from("catalysts")
        .select("*")
        .eq("discord_id", discordId.toLowerCase())
        .maybeSingle();

      if (error) throw new Error(`[catalyst/supabase] findByDiscordId: ${error.message}`);
      if (!data) return null;
      return rowToRecord(data as CatalystsRow);
    },

    async save(payload) {
      const sb = getSupabaseServerClient();
      const { data, error } = await sb
        .from("catalysts")
        .insert({
          name: payload.name,
          discord_id: payload.discordId.toLowerCase(),
          github_id: payload.githubId,
          x_id: payload.xId,
          linkedin_id: payload.linkedinId,
          portfolio_url: payload.portfolioUrl,
        })
        .select()
        .single();

      if (error) {
        // Postgres unique constraint violation on discord_id
        if (error.code === "23505") throw new DuplicateError();
        throw new Error(`[catalyst/supabase] save: ${error.message}`);
      }

      return rowToRecord(data as CatalystsRow);
    },
  };
}

// ---------------------------------------------------------------------------
// Upstash Redis adapter  (fallback)
// ---------------------------------------------------------------------------

function upstashRun(url: string, token: string) {
  return async function run(...cmd: (string | number)[]): Promise<unknown> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(8_000),
    });
    const j = (await res.json().catch(() => ({}))) as {
      result?: unknown;
      error?: string;
    };
    if (!res.ok || j.error) throw new Error(`catalyst store: ${j.error ?? res.status}`);
    return j.result ?? null;
  };
}

function upstashStore(url: string, token: string): CatalystStore {
  const run = upstashRun(url, token);
  const key = (discordId: string) => `catalyst:discord:${discordId.toLowerCase()}`;

  return {
    async findByDiscordId(discordId) {
      const raw = (await run("GET", key(discordId))) as string | null;
      if (!raw) return null;
      try {
        return JSON.parse(raw) as CatalystRecord;
      } catch {
        return null;
      }
    },
    async save(payload) {
      // Check for duplicate before writing (Redis has no unique constraint).
      const existing = await this.findByDiscordId(payload.discordId);
      if (existing) throw new DuplicateError();

      const record: CatalystRecord = {
        ...payload,
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      await run("SET", key(payload.discordId), JSON.stringify(record));
      return record;
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-file dev adapter  (local development only, never runs in production)
// ---------------------------------------------------------------------------

function jsonFileStore(): CatalystStore {
  const path = require("node:path") as typeof import("node:path");
  const fs = require("node:fs") as typeof import("node:fs");
  const filePath = path.resolve(process.cwd(), ".catalyst-dev-store.json");

  const read = (): CatalystRecord[] => {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as CatalystRecord[];
    } catch {
      return [];
    }
  };

  return {
    async findByDiscordId(discordId) {
      const all = read();
      return all.find((r) => r.discordId.toLowerCase() === discordId.toLowerCase()) ?? null;
    },
    async save(payload) {
      const all = read();
      if (all.some((r) => r.discordId.toLowerCase() === payload.discordId.toLowerCase())) {
        throw new DuplicateError();
      }
      const record: CatalystRecord = {
        ...payload,
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      all.push(record);
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2), "utf8");
      return record;
    },
  };
}

// ---------------------------------------------------------------------------
// Factory — picks the first fully-configured adapter at runtime
// ---------------------------------------------------------------------------

export function getCatalystStore(): CatalystStore {
  // 1. Supabase (preferred in production)
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && supabaseKey) return supabaseStore();

  // 2. Upstash Redis
  const redisUrl = (
    process.env.CATALYST_STORE_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ""
  ).trim();
  const redisToken = (
    process.env.CATALYST_STORE_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ""
  ).trim();
  if (redisUrl && redisToken) return upstashStore(redisUrl, redisToken);

  // 3. Production with no store configured — fail loudly.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Catalyst store: no storage backend configured in production. " +
        "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (preferred) or " +
        "CATALYST_STORE_URL + CATALYST_STORE_TOKEN.",
    );
  }

  // 4. Local dev JSON fallback.
  console.warn(
    "[catalyst] No store configured — using local JSON fallback (.catalyst-dev-store.json). " +
      "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for production.",
  );
  return jsonFileStore();
}
