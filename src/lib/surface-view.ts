/**
 * Shared vocabulary for rendering a discovered surface — used by the Surfaces
 * island (domain page) and the SSR'd surface detail page, so a surface reads
 * identically wherever it appears.
 *
 * The interfaces are deliberately loose: the values are parsed KV/stream JSON;
 * the strict shape lives in discovery-schema.ts (the writer's contract).
 */

export interface Mechanics {
  source: string;
  scheme?: string;
  in?: string;
  headerName?: string;
  paramName?: string;
  command?: string;
  env?: string[];
  url?: string;
}
export interface CredentialUse {
  id: string;
  mechanics: Mechanics;
}
export interface Basis {
  via: string;
  signal?: string;
  evidence?: string[];
}
export interface AuthEntry {
  use: CredentialUse[];
  basis: Basis;
}
export type AuthStatus =
  | { status: "none"; basis: Basis }
  | { status: "required"; entries: AuthEntry[] }
  | { status: "unknown" };
export interface Credential {
  type: string;
  label: string;
  generateUrl?: string;
  setup: string;
}
export interface Surface {
  name: string;
  type: string;
  docs?: string;
  basis: Basis;
  auth: AuthStatus;
  spec?: string;
  url?: string;
  transports?: string[];
  packages?: { registryType: string; identifier: string; runtimeHint?: string }[];
  command?: string;
}

/** The stored-discovery result shapes read back from KV / the baseline JSON. */
export interface DiscoveryDoc {
  surfaces?: Surface[];
  credentials?: Record<string, Credential>;
}

export const SURFACE_TYPE_LABEL: Record<string, string> = {
  openapi: "OpenAPI",
  rest: "REST",
  graphql: "GraphQL",
  mcp: "MCP",
  cli: "CLI",
};

/** URL slug for a surface name — the `/{domain}/{slug}/` detail-page key. */
export function slugifySurface(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
    case "inline":
      if (m.command) return `$ ${m.command}`;
      if (m.env && m.env.length) return `env ${m.env.join(", ")}`;
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
    return { label: "Connect", cmd: `claude mcp add --transport http ${slugifySurface(surface.name)} ${surface.url}` };
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
