import { detect } from "../src/lib/detect.ts";

export { McpDurableObject } from "./mcp-do.ts";

interface DurableObjectStub {
  fetch: (request: Request) => Promise<Response>;
}
interface DurableObjectNamespace {
  idFromName: (name: string) => unknown;
  get: (id: unknown) => DurableObjectStub;
}

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  POSTHOG_KEY: string;
  MCP: DurableObjectNamespace;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", ...headers },
  });

// Normalize "https://Vercel.com/foo" / "vercel.com" -> "vercel.com"; reject non-domains.
function cleanDomain(input: string | null): string | null {
  if (!input) return null;
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // MCP server (write-once tool registry) — point Claude/Cursor at /mcp.
    // Routed through a single Durable Object so the session map persists.
    if (url.pathname === "/mcp") {
      const stub = env.MCP.get(env.MCP.idFromName("mcp"));
      return stub.fetch(request);
    }

    // Detection endpoint: run the full agent-readiness battery for a domain.
    // GET /api/<domain>/detect -> structured DetectionResult (cached 1h).
    const detectMatch = url.pathname.match(/^\/api\/([^/]+)\/detect\/?$/);
    if (detectMatch) {
      const domain = cleanDomain(decodeURIComponent(detectMatch[1]));
      if (!domain) return json({ error: "invalid domain — GET /api/<domain>/detect" }, 400);
      const cacheKey = new Request(`https://integrations.sh/api/${domain}/detect`);
      const cache = (caches as unknown as { default: Cache }).default;
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      const result = await detect(domain);
      const res = json(result, 200, { "cache-control": "public, max-age=3600" });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const country = request.headers.get("cf-ipcountry") || "unknown";
    const agent = request.headers.get("user-agent") || "unknown";
    if (agent.includes("executor")) {
      ctx.waitUntil(
        fetch("https://us.i.posthog.com/i/v0/e/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: env.POSTHOG_KEY,
            event: "hit",
            distinct_id: ip,
            properties: {
              $process_person_profile: false,
              user_agent: agent,
              country,
              path: url.pathname,
            },
          }),
        }),
      );
    }

    return await env.ASSETS.fetch(request);
  },
};
