// GitHub repo metadata, resolved once at build time. The star count is fetched
// a single time per build (module top-level await runs once and is cached for
// every page render), with a graceful fallback when the API is unavailable.

const REPO = "UsefulSoftwareCo/integrationsdotsh";

export const GITHUB_REPO_URL = `https://github.com/${REPO}`;
export const GITHUB_ORG_URL = "https://github.com/UsefulSoftwareCo";

/** Compact star count, e.g. 1234 -> "1.2k". */
export function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

async function fetchStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { "User-Agent": "integrations.sh-build", Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

export const stars: number | null = await fetchStars();
