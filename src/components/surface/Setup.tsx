/**
 * Minimal safe markdown for credential `setup` prose: ## headers, **bold**,
 * `code`, [links](url). The source is LLM-written — React escapes everything,
 * and only these four constructs are recognized.
 */
import type { ReactNode } from "react";

export function inline(text: string): ReactNode[] {
  return text
    .split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((tok, i) => {
      let m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (m)
        return (
          <a key={i} className="disc-link" href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        );
      if ((m = /^`([^`]+)`$/.exec(tok))) return <code key={i} className="disc-ic">{m[1]}</code>;
      if ((m = /^\*\*([^*]+)\*\*$/.exec(tok))) return <strong key={i}>{m[1]}</strong>;
      return tok;
    });
}

export default function Setup({ md }: { md: string }) {
  return (
    <div className="disc-setup">
      {md.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="disc-setup-gap" />;
        if (t.startsWith("#"))
          return (
            <div key={i} className="disc-setup-h">
              {inline(t.replace(/^#+\s*/, ""))}
            </div>
          );
        return (
          <p key={i} className="disc-setup-p">
            {inline(t)}
          </p>
        );
      })}
    </div>
  );
}
