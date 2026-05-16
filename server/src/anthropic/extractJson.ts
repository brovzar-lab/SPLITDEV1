/**
 * Extract the first balanced JSON object from a string.
 * Handles fenced code blocks (```json ... ```) and free-floating preamble.
 * Throws if no balanced object is found.
 */
export function extractJsonObject(text: string): string {
  // Try fenced code block first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const inner = fenced[1].trim();
    // Sanity check: is it a JSON object?
    if (inner.startsWith('{') && inner.endsWith('}')) return inner;
  }

  // Find first '{' and matching balanced '}'
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('Unbalanced JSON braces in response');
}
