/**
 * Site meta baked at build for the Worker — `/disc/meta.json`.
 * Currently just the GitHub star count, so worker-SSR'd pages render the same
 * nav badge as the prerendered ones without calling the GitHub API at runtime
 * (github.ts getStars reads this file through the ASSETS binding).
 */
import type { APIRoute } from "astro";
import { getStars } from "~/lib/github.ts";

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ stars: await getStars() }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
