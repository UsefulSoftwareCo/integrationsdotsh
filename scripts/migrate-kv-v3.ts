// One-shot: migrate DISCOVERY KV rows from the v2 payload to v3.
//   bun scripts/migrate-kv-v3.ts          # local KV (wrangler --local state)
//   bun scripts/migrate-kv-v3.ts --remote # production KV
//
// v2 → v3 per row:
//   - result.version = 3, result.discoveredAt backfilled from the envelope
//   - every surface gains `slug` = slugified name (deduped) — exactly what the
//     v2 surface page computed at request time, so existing URLs keep working
//   - surface type openapi|rest → http
//   - mechanics source inline → http | cli (keyed by which fields are present)
//
// Idempotent: v3 rows (version === 3) are skipped.
import { execFileSync } from "node:child_process";

const REMOTE = process.argv.includes("--remote");
const FLAG = REMOTE ? "--remote" : "--local";

const wrangler = (...args: string[]): string =>
  execFileSync("bunx", ["wrangler", ...args, FLAG], { encoding: "utf8" });

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface AnyRec {
  [k: string]: unknown;
}

function migrateMechanics(m: AnyRec): AnyRec {
  if (m.source !== "inline") return m;
  const { source: _source, command, env, ...rest } = m;
  if (command || (Array.isArray(env) && env.length)) {
    return { source: "cli", ...(command ? { command } : {}), ...(Array.isArray(env) && env.length ? { env } : {}) };
  }
  return { source: "http", ...rest };
}

function migrateAuth(auth: AnyRec | undefined): AnyRec | undefined {
  if (!auth || auth.status !== "required" || !Array.isArray(auth.entries)) return auth;
  return {
    ...auth,
    entries: auth.entries.map((e: AnyRec) => ({
      ...e,
      use: Array.isArray(e.use) ? e.use.map((u: AnyRec) => ({ ...u, mechanics: migrateMechanics((u.mechanics ?? { source: "unknown" }) as AnyRec) })) : e.use,
    })),
  };
}

function migrateResult(result: AnyRec, discoveredAt: string): AnyRec {
  const taken = new Set<string>();
  const surfaces = (Array.isArray(result.surfaces) ? result.surfaces : []).map((s: AnyRec) => {
    const type = s.type === "openapi" || s.type === "rest" ? "http" : s.type;
    const base = slugify(String(s.name ?? "")) || "surface";
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    return { ...s, type, slug, auth: migrateAuth(s.auth as AnyRec | undefined) };
  });
  return { ...result, version: 3, discoveredAt: result.discoveredAt ?? discoveredAt, surfaces };
}

const keys = (JSON.parse(wrangler("kv", "key", "list", "--binding", "DISCOVERY")) as { name: string }[]).map((k) => k.name);
console.log(`${keys.length} row(s) in ${REMOTE ? "REMOTE" : "local"} DISCOVERY:`, keys.join(", ") || "(none)");

for (const key of keys) {
  const raw = wrangler("kv", "key", "get", key, "--binding", "DISCOVERY");
  const row = JSON.parse(raw) as { result?: AnyRec; discoveredAt?: string; model?: string };
  if (!row.result) {
    console.log(`  ${key}: no result — skipped`);
    continue;
  }
  if (row.result.version === 3) {
    console.log(`  ${key}: already v3 — skipped`);
    continue;
  }
  const migrated = {
    result: migrateResult(row.result, row.discoveredAt ?? new Date().toISOString()),
    discoveredAt: row.discoveredAt ?? new Date().toISOString(),
    model: row.model ?? "v3-migration",
  };
  const tmp = `/tmp/kv-v3-${key.replace(/[^a-z0-9.-]/gi, "_")}.json`;
  await Bun.write(tmp, JSON.stringify(migrated));
  wrangler("kv", "key", "put", key, "--binding", "DISCOVERY", "--path", tmp);
  const n = (migrated.result.surfaces as AnyRec[]).length;
  console.log(`  ${key}: migrated (${n} surface(s): ${(migrated.result.surfaces as AnyRec[]).map((s) => s.slug).join(", ")})`);
}
console.log("Done.");
