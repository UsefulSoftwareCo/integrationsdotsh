/**
 * Site meta the worker needs at runtime — `/disc/meta.json`.
 * Currently just the build-time GitHub star count, so worker-SSR'd pages can
 * render the same nav star badge as the static pages.
 */
import type { APIRoute } from "astro";
import { stars } from "~/lib/github.ts";

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ stars }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
