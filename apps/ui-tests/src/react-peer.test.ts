/**
 * The React the package says it needs is the React it is written for.
 *
 * The components use what React 19 brought: `inert` as a boolean prop, and
 * `ref` as a plain prop of a function component and of an element. Under
 * React 18 neither is an error: `inert` is dropped with a warning, so a panel
 * on its way out stays focusable, and a ref read from props is undefined, so
 * a trigger's own ref is lost. A peer range that admits 18 promises an
 * application those silent failures, so the range is held to the source.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../packages/ui');

function sources(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'generated') found.push(...sources(path));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

/** The lowest major a range such as `>=19`, `^19.2.0` or `19.x` admits. */
function lowestMajor(range: string): number {
  const match = /(\d+)/.exec(range);
  return match ? Number(match[1]) : 0;
}

test('the source uses what React 19 brought', () => {
  const text = sources(join(PACKAGE, 'src')).map((path) => readFileSync(path, 'utf8'));
  expect(text.some((source) => /\binert=\{/.test(source))).toBe(true);
  expect(text.some((source) => /props(\['ref'\]|\.ref\b|\s+as\s+\{\s*ref\?)/.test(source))).toBe(true);
});

test('so the package asks for React 19 and nothing older', () => {
  const manifest = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8')) as {
    peerDependencies: Record<string, string>;
  };
  expect(lowestMajor(manifest.peerDependencies['react'] ?? '')).toBeGreaterThanOrEqual(19);
  expect(lowestMajor(manifest.peerDependencies['react-dom'] ?? '')).toBeGreaterThanOrEqual(19);
});
