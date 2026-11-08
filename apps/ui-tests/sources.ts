/**
 * Where the suites resolve `@crewlethq/*`: the SOURCE, so a run needs no build
 * of the package under test and a failure points at a line somebody can edit.
 * Shared by the jsdom suite and the real-browser layout suite.
 *
 * An ARRAY, and longest first: an object alias matches the whole specifier,
 * so `@crewlethq/icons` alone leaves `@crewlethq/icons/glyphs` unresolved,
 * which is the entry every component draws its glyphs from.
 */
import { fileURLToPath } from 'node:url';

const packages = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

export const sourceAliases = [
  { find: '@crewlethq/icons/glyphs/registry', replacement: packages('icons/src/glyphs-registry.ts') },
  { find: '@crewlethq/icons/glyphs', replacement: packages('icons/src/glyphs.ts') },
  { find: '@crewlethq/icons/characters', replacement: packages('icons/src/characters.ts') },
  { find: '@crewlethq/icons/product-mark', replacement: packages('icons/src/product-mark.ts') },
  { find: '@crewlethq/icons', replacement: packages('icons/src/index.ts') },
  // A folder entry (`@crewlethq/ui/SheetGrid`), which the artifact kit's
  // sources import, resolves to that folder's source.
  { find: /^@crewlethq\/ui\/(\w+)$/, replacement: packages('ui/src/$1/index.ts') },
  { find: '@crewlethq/ui', replacement: packages('ui/src/index.ts') },
];
