import { parse } from "tldts";

/**
 * Icon URL for an already-trusted host (e.g. the domain segment of a page we
 * are rendering) — the /logo proxy (context.dev Logo Link behind the edge
 * cache, Google favicon fallback; see worker/entry.ts). Relative, for use in
 * pages and islands served from integrations.sh itself. The proxy re-validates
 * the domain, so unvalidated input degrades to a 400 + the <img> onerror path.
 */
export function faviconFor(host: string): string {
  return `/logo/${encodeURIComponent(host)}`;
}

/**
 * Icon URL for a domain, or null when it isn't a real public registrable
 * domain. Validated against the Public Suffix List (via tldts), including the
 * PSL's *private* section so platform-hosted apps resolve to their own host
 * (app.vercel.app, user.github.io, bucket.s3.amazonaws.com) rather than the
 * platform. Excludes `.local`/`.internal` hosts, single-label names, IPs, and
 * invalid TLDs — requesting an icon for any of those is wrong.
 *
 * Points at our own /logo proxy — the same source executor uses. Absolute,
 * because these URLs are also published in api.json for external consumers.
 */
export function faviconUrl(domain: string | null | undefined): string | null {
  const registrable = registrableDomain(domain);
  return registrable ? `https://integrations.sh/logo/${registrable}` : null;
}

/** The registrable domain behind `faviconUrl`'s validation, for callers that
 * need the domain itself (the /logo proxy route) rather than a favicon URL. */
export function registrableDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const info = parse(domain, { allowPrivateDomains: true });
  if (info.isIp || !info.domain || !(info.isIcann || info.isPrivate)) return null;
  return info.domain;
}
