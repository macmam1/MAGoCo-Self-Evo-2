/**
 * Minimal, safe markdown rendering.
 *
 * The model output is rendered into the DOM. That means this renderer is a
 * security boundary: a badly-behaved model can emit raw HTML and we must not
 * execute it. Everything here goes through `esc()` — there is no path from
 * model text to a raw tag.
 *
 * Supports: headings, bold, italic, inline code, fenced code blocks, links,
 * unordered lists, paragraph breaks. That is enough for agent output; tables
 * and images are Phase 4.
 */

/** HTML-escape. Every interpolated string passes through this. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMarkdown(input: string): string {
  const lines = input.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block — the only place raw text survives, and it is
    // escaped too.
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const lang = fence[1] ?? '';
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip the closing fence
      out.push(
        `<pre data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    // Unordered list — consecutive list lines become one <ul>
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Paragraph: gather until a blank line or a structural line
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

/** Inline formatting: bold, italic, code, links. */
function inline(s: string): string {
  let out = esc(s);
  // Inline code first so its contents are not re-processed as markdown.
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  // Bold must run before italic — **a** would otherwise eat the first *.
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // Links: [text](url). Only http(s) and relative URLs.
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text: string, url: string) => {
      const safe = /^https?:|^[/#.]/.test(url) ? url : '#';
      return `<a href="${esc(safe)}" rel="noreferrer">${text}</a>`;
    },
  );
  return out;
}
