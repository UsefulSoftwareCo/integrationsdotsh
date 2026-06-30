/**
 * Site chrome — THE single source of truth for the shared shell: design tokens,
 * the nav (wordmark + GitHub star badge), the footer, and the common atoms
 * (frame-guides, container, breadcrumb, section headers, code blocks, kv lists,
 * the favicon page header). Consumed BOTH by the Astro layout (Base.astro, via
 * `set:html`) and by the worker-rendered surface page (worker/surface-page.ts,
 * as a string). One copy → no drift between the static pages and the SSR'd ones.
 *
 * Pure strings only — must stay importable by the Cloudflare Worker, so no Astro,
 * no React, and no `github.ts` (its top-level `await` would run in the worker).
 */

export const REPO_URL = "https://github.com/UsefulSoftwareCo/integrationsdotsh";

/** Compact star count, e.g. 1234 -> "1.2k". Mirrors github.ts.formatStars. */
export const formatStars = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

/** `<head>` font preloads + Geist stylesheet. */
export const FONT_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const STAR_SVG = `<svg class="ghstar-ico" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path fill="#e3b341" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>`;

/** The top nav, with the live star count baked in (null = omit the count). */
export const navHtml = (stars: number | null): string =>
  `<nav class="site"><div class="container"><a class="wordmark" href="/">integrations.sh</a>` +
  `<a class="ghstar" href="${REPO_URL}" target="_blank" rel="noopener">${STAR_SVG}<span>star on github</span>` +
  `${stars != null ? `<span class="ghstar-n">${formatStars(stars)}</span>` : ""}</a></div></nav>`;

export const footerHtml = (): string =>
  `<footer class="site"><div class="container"><span>integrations.sh</span><a href="${REPO_URL}" target="_blank" rel="noopener">star on github</a></div></footer>`;

/** The global stylesheet shared by every page (static + SSR'd). */
export const GLOBAL_CSS = `
:root {
  --gray-1000: #0a0a0a; --gray-900: #111; --gray-700: #333; --gray-500: #666; --gray-400: #888;
  --gray-300: #999; --gray-200: #d4d4d4; --gray-100: #eaeaea; --gray-50: #f5f5f5; --gray-25: #fafafa; --white: #fff;
  --font-sans: "Geist", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --container: 1100px; color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --gray-1000: #ededed; --gray-900: #ededed; --gray-700: #c4c4c4; --gray-500: #9a9a9a; --gray-400: #7a7a7a;
    --gray-300: #5c5c5c; --gray-200: #333333; --gray-100: #1f1f1f; --gray-50: #1a1a1a; --gray-25: #141414; --white: #0a0a0a;
  }
}
*, *::before, *::after { box-sizing: border-box; }
html { scrollbar-gutter: stable; }
html, body { margin: 0; padding: 0; }
body { background: var(--white); color: var(--gray-900); font: 400 15px/1.55 var(--font-sans); -webkit-font-smoothing: antialiased; min-height: 100vh; display: flex; flex-direction: column; }
a { color: inherit; }
::selection { background: #dbeafe; color: #0a0a0a; }
@media (prefers-color-scheme: dark) { ::selection { background: #2e4a6e; color: #ededed; } }

.frame-guides { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.frame-guides::before, .frame-guides::after { content: ""; position: absolute; top: 0; bottom: 0; width: 1px; background: var(--gray-100); }
.frame-guides::before { left: calc(50% - var(--container) / 2); }
.frame-guides::after { right: calc(50% - var(--container) / 2); }
@media (max-width: 1140px) { .frame-guides { display: none; } }
.container { max-width: var(--container); margin: 0 auto; padding: 0 40px; position: relative; z-index: 1; }

nav.site { border-bottom: 1px solid var(--gray-100); background: var(--white); position: relative; z-index: 2; }
nav.site .container { height: 64px; display: flex; align-items: center; gap: 32px; }
.wordmark { font-family: var(--font-mono); font-size: 14px; font-weight: 500; color: var(--gray-1000); text-decoration: none; white-space: nowrap; }
.ghstar { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 12.5px; color: var(--gray-500); text-decoration: none; border: 1px solid var(--gray-200); border-radius: 7px; padding: 5px 11px; transition: color 0.12s, border-color 0.12s; }
.ghstar:hover { color: var(--gray-1000); border-color: var(--gray-400); }
.ghstar-ico { flex-shrink: 0; }
.ghstar-n { font-variant-numeric: tabular-nums; color: var(--gray-400); padding-left: 8px; border-left: 1px solid var(--gray-200); }

main { flex: 1 0 auto; padding-bottom: 72px; }
footer.site { border-top: 1px solid var(--gray-100); position: relative; z-index: 1; background: var(--white); }
footer.site .container { height: 56px; display: flex; align-items: center; gap: 24px; font-family: var(--font-mono); font-size: 12px; color: var(--gray-400); }
footer.site a { color: var(--gray-400); text-decoration: none; }
footer.site a:hover { color: var(--gray-1000); }

/* shared atoms */
.sec-label { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gray-400); }
.sec-header { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--gray-100); }
.sec-note { font-family: var(--font-mono); font-size: 11px; color: var(--gray-400); }
.crumb { padding: 28px 0 0; font-family: var(--font-mono); font-size: 12px; color: var(--gray-400); }
.crumb a { color: var(--gray-400); text-decoration: none; }
.crumb a:hover { color: var(--gray-1000); }
.crumb .sep { margin: 0 6px; color: var(--gray-200); }
code { font-family: var(--font-mono); font-size: 0.88em; }
.code-block { background: var(--gray-25); border: 1px solid var(--gray-100); border-radius: 6px; padding: 13px 16px; overflow-x: auto; font-family: var(--font-mono); font-size: 12.5px; line-height: 1.65; color: var(--gray-700); margin: 0; }

/* favicon page header (domain + surface detail) */
.head { padding: 24px 0 0; display: flex; align-items: flex-start; gap: 16px; max-width: 760px; }
.favicon { position: relative; width: 40px; height: 40px; border: 1px solid var(--gray-100); border-radius: 8px; display: grid; place-items: center; background: var(--white); flex-shrink: 0; margin-top: 2px; }
.fav-letter { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 600; color: var(--gray-400); }
.favicon img { position: relative; z-index: 1; border-radius: 4px; background: var(--white); }
.head h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.2; margin: 0; word-break: break-word; }
.head .meta { margin: 6px 0 0; font-family: var(--font-mono); font-size: 12px; color: var(--gray-400); display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }

/* key/value detail list */
dl.kv { display: grid; grid-template-columns: max-content 1fr; gap: 10px 28px; margin: 18px 0 0; font-size: 14px; }
dl.kv dt { color: var(--gray-400); font-family: var(--font-mono); font-size: 12.5px; }
dl.kv dd { margin: 0; min-width: 0; word-break: break-all; }
dl.kv a { text-decoration: underline; text-underline-offset: 2px; }
dl.kv a:hover { color: var(--gray-500); }
dl.kv code { background: var(--gray-50); padding: 1px 6px; border-radius: 3px; font-size: 12.5px; }

/* markdown (marked output / setup prose) */
.md { line-height: 1.65; }
.md > :first-child { margin-top: 0; }
.md > :last-child { margin-bottom: 0; }
.md p { margin: 0 0 0.8em; }
.md a { color: var(--gray-1000); text-decoration: underline; text-underline-offset: 2px; }
.md a:hover { color: var(--gray-500); }
.md code { background: var(--gray-50); padding: 1px 5px; border-radius: 3px; font-size: 0.86em; }
.md pre { background: var(--gray-25); border: 1px solid var(--gray-100); padding: 13px 16px; border-radius: 6px; overflow: auto; font-size: 12.5px; line-height: 1.65; margin: 0.9em 0; }
.md pre code { background: transparent; padding: 0; }
.md ul, .md ol { padding-left: 1.3em; margin: 0 0 0.8em; }
.md strong { color: var(--gray-1000); }
`;
