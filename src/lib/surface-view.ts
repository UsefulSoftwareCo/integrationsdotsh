/**
 * Shared vocabulary for rendering a discovered surface — used by the Surfaces
 * island (domain page) and the SSR'd surface detail page, so a surface reads
 * identically wherever it appears.
 *
 * Types come from the canonical schema via `import type` (zero runtime effect
 * in the client bundle); this module adds only display logic.
 */
import type { AuthStatus, Basis, Credential, DiscoveryResult, Mechanics } from "./discovery-schema.ts";

export type { Credential, Mechanics };
export type { AuthEntry, AuthStatus, Basis, CredentialUse } from "./discovery-schema.ts";

/**
 * Flat renderer view of a Surface: the union widened so per-kind fields are
 * all optional. Display code reads parsed JSON generically ("show url if
 * present"); forcing a type-narrow at every field read buys nothing there.
 * The STRICT discriminated union (discovery-schema.ts Surface) remains the
 * wire/write contract.
 */
export interface Surface {
  slug: string;
  name: string;
  type: string;
  docs?: string;
  basis: Basis;
  auth: AuthStatus;
  spec?: string;
  url?: string;
  transports?: readonly string[];
  packages?: readonly { registryType: string; identifier: string; runtimeHint?: string }[];
  command?: string;
  notes?: string;
}

/** The stored-discovery result shape read back from KV / the baseline JSON. */
export type DiscoveryDoc = Partial<Pick<DiscoveryResult, "credentials">> & { surfaces?: Surface[] };

export const SURFACE_TYPE_LABEL: Record<string, string> = {
  http: "REST",
  graphql: "GraphQL",
  mcp: "MCP",
  cli: "CLI",
  // v2 vocabulary — still in old stored rows until re-discovered.
  openapi: "OpenAPI",
  rest: "REST",
};

export function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Action verb for the credential's "go get it" button, by credential type. */
export function credCta(type: string): string {
  if (type.startsWith("oauth")) return "Set up OAuth";
  if (type === "basic") return "Get credentials";
  if (type === "bearer") return "Get token";
  if (type === "aws_sigv4") return "Get keys";
  return "Get key";
}

/** One-line "how the credential is passed" summary for an auth entry. */
export function mechanicsLine(m: Mechanics): string {
  switch (m.source) {
    case "spec":
      return `OpenAPI scheme · ${m.scheme || "see spec"}`;
    case "well-known":
      return "OAuth · resolves from well-known metadata";
    case "metadata":
      return `OAuth · metadata at ${hostOf(m.url)}`;
    case "cli":
      if (m.command) return `$ ${m.command}`;
      if (m.env?.length) return `env ${m.env.join(", ")}`;
      return "CLI login";
    case "http":
      if (m.in === "query") return `?${m.paramName ?? "api_key"}=<credential>`;
      if (m.in === "body") return `${m.paramName ?? "api_key"}=<credential>`;
      return `${m.headerName ?? "Authorization"}: ${m.scheme ? `${m.scheme} ` : ""}<credential>`;
    default:
      return "mechanics not captured";
  }
}

/** A `claude mcp add` / install one-liner, when we have what we need. */
export function connectCmd(surface: Surface): { label: string; cmd: string } | null {
  if (surface.type === "mcp" && surface.url) {
    return { label: "Connect", cmd: `claude mcp add --transport http ${surface.slug} ${surface.url}` };
  }
  if (surface.type === "cli") {
    const p = surface.packages?.[0];
    if (p) {
      return {
        label: "Install",
        cmd: p.runtimeHint === "npx" ? `npx ${p.identifier}` : `${p.registryType === "npm" ? "npm i -g" : p.registryType} ${p.identifier}`,
      };
    }
  }
  return null;
}
