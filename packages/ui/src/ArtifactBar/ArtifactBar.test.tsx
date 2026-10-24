/**
 * The slim bar over an open artifact: the title as the heading and renamed in
 * place, the tools drawn twice (in the bar and folded into More), and the
 * version chip that says when history is on show.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { InfoGlyph, RotateCcwClockGlyph, Share2Glyph } from '@crewlethq/icons/glyphs';
import { LayerHost } from '../Layer/index.js';
import { ArtifactBar, ArtifactVersionChip, type ArtifactBarTool } from './index.js';
import { breakpoint } from '@crewlethq/tokens';
import { installAtWidth, px } from '../../../../apps/ui-tests/src/cascade.js';

afterEach(cleanup);

function tools(overrides: Partial<Record<string, Partial<ArtifactBarTool>>> = {}): ArtifactBarTool[] {
  return [
    { key: 'details', label: 'Details', icon: <InfoGlyph size="sm" />, keys: ['i'], onSelect: vi.fn(), ...overrides.details },
    { key: 'history', label: 'History', icon: <RotateCcwClockGlyph size="sm" />, keys: ['h'], onSelect: vi.fn(), ...overrides.history },
    { key: 'share', label: 'Share', icon: <Share2Glyph size="sm" />, labelled: true, onSelect: vi.fn(), ...overrides.share },
  ];
}

test('the title is the page heading, beside the kind said in words', () => {
  render(<ArtifactBar title="Q4 roadmap" kind="slides" kindLabel="Slides" tools={tools()} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Q4 roadmap' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Slides' })).toBeTruthy();
  expect(screen.getByRole('banner').getAttribute('aria-labelledby')).toBe(
    screen.getByRole('heading', { level: 1 }).id,
  );
});

// THE GLYPH IS IN THE KIND'S INK, as the gallery's badge and the Make row
// draw it: the bar carries the kind's class, which sets `--crewlet-kind-ink`.
test("the kind's glyph is drawn in the kind's colour", () => {
  render(<ArtifactBar title="Q4 roadmap" kind="design" kindLabel="Design" />);
  expect(screen.getByRole('img', { name: 'Design' }).classList.contains('crewlet-kind--design')).toBe(true);
});

test('the way back is a link named by where it goes', () => {
  render(<ArtifactBar title="Q4 roadmap" kind="slides" kindLabel="Slides" back={{ href: '#/artifacts', label: 'Back to artifacts' }} />);
  const back = screen.getByRole('link', { name: 'Back to artifacts' });
  expect(back.getAttribute('href')).toBe('#/artifacts');
});

test('a tool is a button with its shortcut said, pressed while its panel is open', () => {
  const set = tools({ history: { pressed: true } });
  const { container } = render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" tools={set} />);
  const wide = container.querySelector('.crewlet-artifact-bar__end')!;
  const history = within(wide as HTMLElement).getByRole('button', { name: 'History' });
  expect(history.getAttribute('aria-pressed')).toBe('true');
  expect(history.getAttribute('aria-keyshortcuts')).toBe('H');
  fireEvent.click(within(wide as HTMLElement).getByRole('button', { name: 'Details' }));
  expect(set[0]!.onSelect).toHaveBeenCalledTimes(1);
});

test('a labelled tool keeps its word while the bar is wide and its glyph when it is not', () => {
  const { container } = render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" tools={tools()} />);
  const roomy = container.querySelector('.crewlet-artifact-bar__roomy')!;
  const tight = container.querySelector('.crewlet-artifact-bar__tight')!;
  expect(within(roomy as HTMLElement).getByRole('button', { name: 'Share' }).textContent).toContain('Share');
  expect(within(tight as HTMLElement).getByRole('button', { name: 'Share' }).textContent).toBe('');
});

test('a status is said before the tools, and a primary tool keeps its word at every width', () => {
  const save = vi.fn();
  const { container } = render(
    <ArtifactBar
      title="Notes"
      kind="doc"
      kindLabel="Doc"
      status={<span role="status">Editing</span>}
      kindTools={[
        { key: 'cancel', label: 'Cancel', icon: <InfoGlyph size="sm" />, labelled: true, onSelect: vi.fn() },
        { key: 'save', label: 'Save', icon: <Share2Glyph size="sm" />, labelled: true, emphasis: 'primary', onSelect: save },
      ]}
      tools={tools()}
    />,
  );
  const end = container.querySelector('.crewlet-artifact-bar__end')!;
  expect(end.firstElementChild?.textContent).toBe('Editing');
  // One Save, with its word, rather than a word and a glyph the stylesheet chooses between.
  const saves = within(end as HTMLElement).getAllByRole('button', { name: 'Save' });
  expect(saves).toHaveLength(1);
  expect(saves[0]!.textContent).toContain('Save');
  fireEvent.click(saves[0]!);
  expect(save).toHaveBeenCalledTimes(1);
  // Cancel is an ordinary labelled tool: its word while wide, its glyph when not.
  expect(within(end as HTMLElement).getAllByRole('button', { name: 'Cancel' })).toHaveLength(2);
});

// A SHORT WORD FOR A NARROW BAR: both words are drawn and the bar's width
// picks one, while the accessible name stays the full one at every width.
test('a primary tool with a short word keeps its full word as its name', () => {
  render(
    <ArtifactBar
      title="New design"
      kind="design"
      kindLabel="Design"
      kindTools={[
        {
          key: 'create',
          label: 'Create and ask SRE Lead',
          shortLabel: 'Create',
          icon: <Share2Glyph size="sm" />,
          labelled: true,
          emphasis: 'primary',
          onSelect: vi.fn(),
        },
      ]}
    />,
  );
  const create = screen.getByRole('button', { name: 'Create and ask SRE Lead' });
  expect(create.querySelector('.crewlet-artifact-bar__word-full')?.textContent).toBe('Create and ask SRE Lead');
  expect(create.querySelector('.crewlet-artifact-bar__word-short')?.textContent).toBe('Create');
});

test('on a narrow bar the views and the unlabelled tools are rows of More, with their keys', () => {
  const onMode = vi.fn();
  const set = tools();
  const { container } = render(
    <LayerHost>
      <ArtifactBar
        title="Q4 roadmap"
        kind="slides"
        kindLabel="Slides"
        modes={{
          label: 'View',
          value: '',
          options: [
            { value: '', label: 'Edit' },
            { value: 'grid', label: 'Grid' },
          ],
          onValueChange: onMode,
        }}
        tools={set}
        menu={[{ key: 'copy', label: 'Copy link', onSelect: vi.fn() }]}
      />
    </LayerHost>,
  );
  const narrow = container.querySelector('.crewlet-artifact-bar__narrow') as HTMLElement;
  fireEvent.click(within(narrow).getByRole('button', { name: 'More for “Q4 roadmap”' }));
  const menu = screen.getByRole('menu');
  expect(within(menu).getAllByRole('menuitemradio').map((el) => el.textContent)).toEqual(['Edit', 'Grid']);
  const rows = within(menu).getAllByRole('menuitem').map((el) => el.textContent ?? '');
  expect(rows[0]).toContain('Details');
  expect(rows[1]).toContain('History');
  expect(rows[2]).toContain('Copy link');
  // Share is labelled, so it stays in the bar rather than folding.
  expect(rows.some((r) => r.includes('Share'))).toBe(false);
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Grid' }));
  expect(onMode).toHaveBeenCalledWith('grid');
});

test('the wide More holds the menu alone', () => {
  const { container } = render(
    <LayerHost>
      <ArtifactBar title="Notes" kind="doc" kindLabel="Doc" tools={tools()} menu={[{ key: 'copy', label: 'Copy link', onSelect: vi.fn() }]} />
    </LayerHost>,
  );
  const wide = container.querySelectorAll('.crewlet-artifact-bar__wide');
  const more = [...wide].map((el) => within(el as HTMLElement).queryByRole('button', { name: 'More for “Notes”' })).find(Boolean)!;
  fireEvent.click(more);
  expect(within(screen.getByRole('menu')).getAllByRole('menuitem').map((el) => el.textContent)).toEqual(['Copy link']);
});

test('pressing the title renames it in place; Enter takes the new title', async () => {
  const onRename = vi.fn(async () => undefined);
  render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={onRename} />);
  const heading = screen.getByRole('heading', { level: 1, name: 'Notes' });
  const button = within(heading).getByRole('button', { name: 'Notes' });
  expect(button.getAttribute('aria-describedby')).toBeTruthy();
  fireEvent.click(button);
  const field = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement;
  expect(document.activeElement).toBe(field);
  fireEvent.change(field, { target: { value: '  Design notes  ' } });
  await act(async () => {
    fireEvent.keyDown(field, { key: 'Enter' });
  });
  expect(onRename).toHaveBeenCalledWith('Design notes');
  expect(screen.queryByRole('textbox')).toBeNull();
});

test('Escape puts the title back and is not heard by anything under the field', () => {
  const onRename = vi.fn();
  const outer = vi.fn();
  document.addEventListener('keydown', outer);
  render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={onRename} />);
  fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
  const field = screen.getByRole('textbox', { name: 'Title' });
  fireEvent.change(field, { target: { value: 'Other' } });
  fireEvent.keyDown(field, { key: 'Escape' });
  document.removeEventListener('keydown', outer);
  expect(onRename).not.toHaveBeenCalled();
  expect(outer).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeTruthy();
});

test('an answer that names a problem keeps the field open and says it', async () => {
  const onRename = vi.fn(async () => 'That title is too long.');
  render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={onRename} />);
  fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
  const field = screen.getByRole('textbox', { name: 'Title' });
  fireEvent.change(field, { target: { value: 'x'.repeat(300) } });
  await act(async () => {
    fireEvent.keyDown(field, { key: 'Enter' });
  });
  expect(screen.getByRole('alert').textContent).toBe('That title is too long.');
  expect(field.getAttribute('aria-invalid')).toBe('true');
});

test('an empty title is refused before it is sent', async () => {
  const onRename = vi.fn();
  render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={onRename} />);
  fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
  const field = screen.getByRole('textbox', { name: 'Title' });
  fireEvent.change(field, { target: { value: '   ' } });
  await act(async () => {
    fireEvent.keyDown(field, { key: 'Enter' });
  });
  expect(onRename).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toBe('A title cannot be empty.');
});

test('a reader who may not rename reads the title as text', () => {
  render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" />);
  expect(within(screen.getByRole('heading', { level: 1 })).queryByRole('button')).toBeNull();
});

test('a long read-only title is cut with an ellipsis in a block of its own, and offered whole on hover', () => {
  const long = 'New slide deck for the quarterly board review of the payments platform';
  render(<ArtifactBar title={long} kind="slides" kindLabel="Slides" />);
  const heading = screen.getByRole('heading', { level: 1, name: long });
  expect(heading.getAttribute('title')).toBe(long);
  const words = heading.querySelector('.crewlet-artifact-bar__text');
  expect(words?.textContent).toBe(long);
  // The heading is a flex row, where an ellipsis cuts nothing; the block takes it.
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ArtifactBar.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = /\.crewlet-artifact-bar__text\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  for (const declaration of [/min-width:\s*0/, /overflow:\s*hidden/, /text-overflow:\s*ellipsis/, /white-space:\s*nowrap/]) {
    expect(rule).toMatch(declaration);
  }
});

test('a renamable title stays its button, which cuts its own words', () => {
  render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={() => undefined} />);
  const heading = screen.getByRole('heading', { level: 1 });
  expect(within(heading).getByRole('button')).toBeDefined();
  expect(heading.querySelector('.crewlet-artifact-bar__text')).toBeNull();
});

test('renaming can be started from elsewhere, such as a Rename row', () => {
  const { rerender } = render(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={vi.fn()} renaming={false} />);
  expect(screen.queryByRole('textbox')).toBeNull();
  rerender(<ArtifactBar title="Notes" kind="doc" kindLabel="Doc" onRename={vi.fn()} renaming />);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Title' }));
});

test('the version chip says an older version and opens the versions', () => {
  const pick = vi.fn();
  render(
    <LayerHost>
      <ArtifactVersionChip
        version={2}
        latest={3}
        items={[
          { key: 'v3', label: 'Version 3', checked: false, onSelect: pick },
          { key: 'v2', label: 'Version 2', checked: true, onSelect: pick },
        ]}
      />
    </LayerHost>,
  );
  const chip = screen.getByRole('button', { name: 'Versions: v2 of 3' });
  expect(chip.classList.contains('crewlet-version-chip--older')).toBe(true);
  fireEvent.click(chip);
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Version 3' }));
  expect(pick).toHaveBeenCalledTimes(1);
});

test('carries no axe violation, read only and renamable', async () => {
  const { container } = render(
    <LayerHost>
      <ArtifactBar
        title="Q4 roadmap"
        kind="slides"
        kindLabel="Slides"
        back={{ href: '#/artifacts', label: 'Back to artifacts' }}
        version={<ArtifactVersionChip version={3} latest={3} items={[]} />}
        modes={{ label: 'View', value: '', options: [{ value: '', label: 'Edit' }, { value: 'grid', label: 'Grid' }], onValueChange: vi.fn() }}
        tools={tools({ details: { badge: 2 } })}
        menu={[{ key: 'copy', label: 'Copy link', onSelect: vi.fn() }]}
        onRename={vi.fn()}
      />
      <main>
        <ArtifactBar as="div" headingLevel={2} title="Notes" kind="doc" kindLabel="Doc" tools={tools()} />
        <ArtifactBar
          as="div"
          headingLevel={2}
          title="Plan"
          kind="doc"
          kindLabel="Doc"
          status={<span role="status">Editing</span>}
          kindTools={[{ key: 'save', label: 'Save', icon: <Share2Glyph size="sm" />, labelled: true, emphasis: 'primary', onSelect: vi.fn() }]}
        />
      </main>
    </LayerHost>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

// THE RENAME HINT DESCRIBES THE TITLE and is nowhere else: visually hidden, it
// was also a stray "Rename" a screen reader met on its own beside the title.
test('the rename hint is the title button\'s description and no text of its own', () => {
  render(<ArtifactBar title="Q4 roadmap" kind="slides" kindLabel="Slides" onRename={() => undefined} />);
  const title = screen.getByRole('button', { name: 'Q4 roadmap' });
  expect(title.getAttribute('aria-describedby')).toBeTruthy();
  const hint = document.getElementById(title.getAttribute('aria-describedby')!)!;
  expect(hint.textContent).toBe('Rename');
  expect(hint.hidden).toBe(true);
});

// THE SHELL TOP BAR'S INSET. The bar stands in that bar's place, so its ends
// sit where the top bar's do over the content: 20px wide and 16px under the
// shell's breakpoint. At 12px of its own a create page's controls ended past
// the content under them.
test('the bar takes the shell top bar inset on both sides, at both steps', () => {
  const step = Number.parseFloat(breakpoint.shell);
  for (const [width, expected] of [
    [step - 1, 16],
    [step, 20],
  ] as const) {
    const uninstall = installAtWidth(width, 'light', 'ArtifactBar/ArtifactBar.css');
    try {
      const { container, unmount } = render(<ArtifactBar title="Q3 plan" kind="doc" kindLabel="Doc" />);
      const row = container.querySelector('.crewlet-artifact-bar__row')!;
      expect(px(row, 'padding-left'), `at ${width}`).toBe(expected);
      // jsdom reserves no gutter, so the end is the same step.
      expect(px(row, 'padding-right'), `at ${width}`).toBe(expected);
      unmount();
    } finally {
      uninstall();
    }
  }
});
