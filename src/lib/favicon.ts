import { parse } from "tldts";

/**
 * Favicon URL for a host. Goes through Google's `s2` service rather than hitting
 * the host's own `/favicon.ico` directly: a browser `<img>` to `/favicon.ico`
 * is unreliable — many hosts hotlink-block on `Referer`/`Origin` or sit behind a
 * Cloudflare challenge, so the request errors in-browser even when `curl` (which
 * sends no `Referer`) gets a 200. `s2` fetches server-side and re-serves with
 * permissive, cacheable headers, so it loads consistently. `sz=64` for a crisp
 * icon in the 40px header box. Pure string — safe everywhere (no `tldts`).
 */
export function faviconFor(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

/**
 * Favicon URL for a domain, or null when it isn't a real public registrable
 * domain. Validated against the Public Suffix List (via tldts), including the
 * PSL's *private* section so platform-hosted apps resolve to their own host
 * (app.vercel.app, user.github.io, bucket.s3.amazonaws.com) rather than the
 * platform. Excludes `.local`/`.internal` hosts, single-label names, IPs, and
 * invalid TLDs — requesting a favicon for any of those is wrong.
 */
export function faviconUrl(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const info = parse(domain, { allowPrivateDomains: true });
  if (info.isIp || !info.domain || !(info.isIcann || info.isPrivate)) return null;
  return faviconFor(info.domain);
}
