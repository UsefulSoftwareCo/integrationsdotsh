import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://integrations.sh",
  integrations: [
    react(),
    // Enumerate every static page (homepage, /<domain>/*, /<kind>/<slug>/*) so crawlers
    // don't depend on the client-rendered listing. Exclude JSON API routes.
    sitemap({ filter: (page) => !page.includes("/api/") && !page.includes("/disc/") }),
  ],
  build: {
    format: "directory",
  },
  vite: {
    // Allow access over the tailnet (by IP or .ts.net hostname). `true`
    // disables Vite's host check — fine for a dev/preview server on a private net.
    preview: { allowedHosts: true },
    server: { allowedHosts: true },
  },
});
