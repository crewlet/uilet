// The Toaster's stories are what a reader learns the component from, so two
// defects in them are held here, read from the source:
//
// - A story that stacks two Toasters draws two pairs of live regions, which a
//   host never has: every demo here mounts one Toaster, and the ReadingTime
//   story draws both of its toasts through one.
// - A comment block directly above another is orphaned: Storybook reads only
//   the one nearest a story as its description, so the story above lost its
//   own.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/stories/Toaster.stories.tsx', import.meta.url), 'utf8');

/** The source of one exported story, up to the next export. */
function story(name) {
  const start = source.indexOf(`export const ${name}: Story`);
  assert.notEqual(start, -1, `no story ${name}`);
  const next = source.indexOf('\nexport const ', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

test('the ReadingTime story draws its toasts through one Toaster', () => {
  const body = story('ReadingTime');
  // makeDemo mounts a Toaster of its own, so it counts as one.
  const toasters = (body.match(/<Toaster\b/g) ?? []).length + (body.match(/\bmakeDemo\(/g) ?? []).length;
  assert.equal(toasters, 1, `ReadingTime mounts ${toasters} Toasters`);
});

test('no comment block sits directly above another', () => {
  const orphaned = source.match(/\*\/\s*\n\s*\/\*\*/g) ?? [];
  assert.equal(orphaned.length, 0, 'a story description is directly above another one');
});
