/**
 * Catalog → discovery format.
 *
 * The discovery JSON (DiscoveryResult — credentials + typed surfaces) is the one
 * format the whole site derives from. The static registry predates it, so we
 * express each catalog record AS a discovery surface here. Auth from the catalog
 * is thin (it never captured per-method credentials), so surfaces come out as
 * `unknown` (or `none` when the record says so) — live discovery enriches them.
 *
 * Basis is `detected`/`registry`: these came from machine-normalized registries.
 */
import type { Integration } from "./types.ts";

const REG_BASIS = { via: "detected" as const, signal: "registry" };

/** A discovery surface (loose — the strict shape lives in discovery-schema.ts). */
export interface BaselineSurface {
  name: string;
  type: string;
  docs?: string;
  basis: { via: "detected"; signal: string };
  auth: { status: "none"; basis: { via: "detected"; signal: string } } | { status: "unknown" };
  url?: string;
  spec?: string;
  transports?: string[];
  command?: string;
  notes?: string;
}

export function recordToSurface(r: Integration): BaselineSurface | null {
  switch (r.kind) {
    case "mcp":
      return {
        name: r.name,
        type: "mcp",
        docs: r.url,
        basis: REG_BASIS,
        url: r.mcp?.remoteUrl,
        transports: r.mcp?.transport ? [r.mcp.transport] : undefined,
        auth: r.mcp?.isAuthless ? { status: "none", basis: REG_BASIS } : { status: "unknown" },
      };
    case "openapi":
      return { name: r.name, type: "openapi", docs: r.url, basis: REG_BASIS, spec: r.openapi?.specUrl, url: r.url, auth: { status: "unknown" } };
    case "graphql":
      return {
        name: r.name,
        type: "graphql",
        docs: r.graphql?.docs?.[0]?.url ?? r.url,
        basis: REG_BASIS,
        url: r.graphql?.endpoint,
        auth: r.graphql?.hasSecurity ? { status: "unknown" } : { status: "none", basis: REG_BASIS },
      };
    case "cli":
      return { name: r.name, type: "cli", docs: r.cli?.docs ?? r.url, basis: REG_BASIS, command: r.slug, notes: r.cli?.install, auth: { status: "unknown" } };
    default:
      return null;
  }
}

/** The baseline DiscoveryResult for a domain, built from its catalog records. */
export function catalogDiscovery(domain: string, records: Integration[]) {
  const surfaces = records.map(recordToSurface).filter((s): s is BaselineSurface => s !== null);
  return { domain, summary: "", credentials: {}, surfaces };
}
