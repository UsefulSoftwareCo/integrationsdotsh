// Build-time GitHub star count — fetched once per build (the top-level await
// runs once, cached for every page render), with a graceful null fallback.
// The repo URL + star formatting/markup live in src/lib/chrome.ts (the shared
// chrome), so this module is just the number.

const REPO = "UsefulSoftwareCo/integrationsdotsh";

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
