/** Compact star count, e.g. 1234 -> "1.2k". */
export const formatStars = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
