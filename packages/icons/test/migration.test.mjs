/**
 * The way out of the Material Symbols set.
 *
 * 0.4 shipped 105 Material glyphs under their Material names, and 0.5 ships
 * none of them. The README's migration table is the ONLY place a consumer
 * learns what each became, so it has to be complete and it has to be true:
 * a name missing from it is a compile error with no answer, a row pointing at
 * a glyph the package does not carry is an answer that does not compile, and
 * a component column that disagrees with the name beside it sends a reader to
 * an import that does not exist. None of that has a symptom until somebody
 * migrates.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { FILLABLE, componentName, readGlyphs } from '../scripts/glyphs.mjs';
import { PACKAGE } from './support.mjs';

/*
 * Every glyph name 0.4 shipped, as its symbols/20 directory listed them.
 * Written out because that tree is gone: this is the record of what a
 * consumer may be importing, and the table below is held to it.
 */
const MATERIAL = [
  'account_tree', 'add', 'apartment', 'arrow_downward', 'arrow_forward', 'arrow_outward', 'arrow_upward', 'autorenew',
  'block', 'bolt', 'book_2', 'bug_report', 'build', 'cable', 'cached', 'calendar_clock', 'calendar_today', 'chat',
  'check', 'check_circle-fill', 'check_circle', 'chevron_left', 'chevron_right', 'close', 'code', 'computer',
  'content_copy', 'create_new_folder', 'crown', 'cycle', 'dark_mode', 'dashboard', 'database', 'delete', 'description',
  'difference', 'dns', 'drag_indicator', 'edit', 'error-fill', 'error', 'explore', 'fit_screen', 'flag', 'folder',
  'fork_right', 'fullscreen', 'fullscreen_exit', 'group', 'help', 'inbox', 'info-fill', 'info', 'key',
  'keyboard_arrow_down', 'keyboard_arrow_up', 'keyboard_double_arrow_left', 'keyboard_double_arrow_right', 'layers',
  'light_mode', 'link', 'list', 'manufacturing', 'memory', 'menu', 'more_vert', 'move_item', 'neurology',
  'notifications', 'open_in_new', 'package_2', 'pause', 'person', 'person_add', 'photo_camera', 'power_settings_new',
  'redo', 'refresh', 'remove', 'save', 'schedule', 'search', 'settings', 'settings_backup_restore', 'shield',
  'shield_person', 'smart_toy', 'star-fill', 'star', 'swap_vert', 'tag', 'target', 'terminal', 'timeline', 'token',
  'tune', 'undo', 'unfold_more', 'view_column', 'visibility', 'visibility_off', 'warning-fill', 'warning', 'zoom_in',
  'zoom_out',
];

/** The component 0.4 exported a Material name under, by 0.4's own rule. */
const materialComponent = (name) =>
  `${name
    .split(/[-_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Glyph`;

const glyphs = await readGlyphs();
const readme = await readFile(resolve(PACKAGE, 'README.md'), 'utf8');

/** The rows of the table under the migration marker, as their four cells. */
function migrationRows() {
  const marker = readme.indexOf('<!-- The migration table:');
  assert.ok(marker !== -1, 'README.md has lost the marker above its migration table');
  const lines = readme.slice(marker).split('\n').slice(1);
  const table = lines.slice(lines.findIndex((line) => line.startsWith('|')));
  const rows = [];
  for (const line of table.slice(2)) {
    if (!line.startsWith('|')) break;
    rows.push(
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim().replace(/^`(.*)`$/, '$1')),
    );
  }
  return rows;
}

const rows = migrationRows();

describe('the migration table', () => {
  it('is read from the README, which the rest of this suite depends on', () => {
    assert.equal(new Set(MATERIAL).size, 105);
    assert.ok(rows.length > 0, 'no rows were found under the marker');
  });

  it('names every Material glyph 0.4 shipped, each exactly once', () => {
    const named = rows.map(([material]) => material);
    const repeated = named.filter((name, index) => named.indexOf(name) !== index);
    assert.deepEqual(repeated, []);
    assert.deepEqual([...named].sort(), [...MATERIAL].sort());
  });

  it('gives each the component 0.4 exported it as', () => {
    for (const [material, was] of rows) assert.equal(was, materialComponent(material), material);
  });

  it('points each at a glyph the package carries, under that glyph\'s own component', () => {
    for (const [material, , lucide, is] of rows) {
      assert.ok(glyphs.has(lucide), `${material} is sent to ${lucide}, which glyphs/ does not carry`);
      const filled = material.endsWith('-fill') && FILLABLE.includes(lucide);
      assert.equal(is, filled ? `<${componentName(lucide)} filled />` : componentName(lucide), material);
    }
  });

  it('sends a filled Material glyph to the filled state wherever its successor has one', () => {
    /*
     * `star-fill` becomes the star with `filled`, not the bare star: a kept
     * item drawn as an outline reads as not kept. The other filled names go to
     * an outline because their successors are not FILLABLE, and the test above
     * already refuses a `filled` on those.
     */
    const [, , lucide, is] = rows.find(([material]) => material === 'star-fill');
    assert.equal(lucide, 'star');
    assert.equal(is, '<StarGlyph filled />');
  });
});
