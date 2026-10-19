/**
 * The editor's Markdown round trip, as plain functions: what a load and a
 * save with no edit write, and the spelling a changed block is written in.
 * An application holds its own bodies to them (a Knowledge page's fixtures, a
 * doc's), so a body the editor would rewrite is found by a test rather than
 * by somebody's diff.
 *
 * Importing these brings the document model with them; the editor's shell
 * does not, so a screen that only draws `RichEditor` pays for neither.
 */

import { readMarkdown, writeMarkdown } from './codec.js';

/** The body a load and a save with no edit write: the body itself, byte for byte. */
export function roundTripMarkdown(markdown: string): string {
  const { doc, source } = readMarkdown(markdown);
  return writeMarkdown(doc, source);
}

/** The body as the editor writes it when every block has changed. */
export function canonicalMarkdown(markdown: string): string {
  return writeMarkdown(readMarkdown(markdown).doc);
}
