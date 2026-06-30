/**
 * Per-domain baseline discovery JSON — `/_disc/{domain}.json`.
 *
 * The static catalog expressed in the discovery format, one file per domain.
 * The worker reads this for surface detail pages (merged with any live KV
 * discovery), so every surface — catalog or discovered — derives from the same
 * format. Emitted at build via getStaticPaths.
 */
import type { APIRoute } from "astro";
import type { Integration } from "~/lib/types.ts";
import { all, domainById } from "~/lib/data.ts";
import { catalogDiscovery } from "~/lib/catalog-to-discovery.ts";

const groups = new Map<string, Integration[]>();
for (const r of all) {
  const domain = domainById.get(r.id) || r.slug;
  if (!domain) continue;
  (groups.get(domain) ?? groups.set(domain, []).get(domain)!).push(r);
}

export function getStaticPaths() {
  return [...groups.keys()].map((domain) => ({ params: { domain } }));
}

export const GET: APIRoute = ({ params }) => {
  const domain = params.domain ?? "";
  return new Response(JSON.stringify(catalogDiscovery(domain, groups.get(domain) ?? [])), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
