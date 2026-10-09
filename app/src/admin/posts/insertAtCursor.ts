/** Returns the textarea's value with `text` inserted at (replacing) the current selection. */
export function insertAtCursor(textarea: HTMLTextAreaElement, text: string): string {
  const { value, selectionStart, selectionEnd } = textarea;
  return value.slice(0, selectionStart) + text + value.slice(selectionEnd);
}

const URL_UNSAFE: Record<string, string> = { ' ': '%20', '(': '%28', ')': '%29', '<': '%3C', '>': '%3E' };

/** `![alt](url)` with `\`, `[` and `]` escaped in the alt text and characters that would end the link target percent-encoded. */
export function imageMarkdown(alt: string, url: string): string {
  const safeAlt = alt.replace(/[\r\n]+/g, ' ').replace(/[\\[\]]/g, (c) => `\\${c}`);
  const safeUrl = url.replace(/[\s()<>]/g, (c) => URL_UNSAFE[c] ?? encodeURIComponent(c));
  return `![${safeAlt}](${safeUrl})`;
}

/**
 * Indents every line touched by [start, end) by two spaces. Returns the new value and the
 * adjusted selection so the indented block stays selected.
 */
export function indentLines(value: string, start: number, end: number): { value: string; start: number; end: number } {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  // A selection ending right after a newline does not include the following line.
  const blockEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const lines = value.slice(lineStart, blockEnd).split('\n');
  const indented = lines.map((l) => `  ${l}`).join('\n');
  return {
    value: value.slice(0, lineStart) + indented + value.slice(blockEnd),
    start: start + 2,
    end: end + 2 * lines.length,
  };
}
