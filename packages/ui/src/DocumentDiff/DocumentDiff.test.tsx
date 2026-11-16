/**
 * The document diff: blocks drawn as the document with their kind marked and
 * said, changed words marked in place, and a folded run counted.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DocumentDiff, DocumentDiffAdded, DocumentDiffRemoved, type DocumentDiffBlock } from './index.js';

afterEach(cleanup);

const BLOCKS: DocumentDiffBlock[] = [
  { change: 'skipped', count: 2 },
  {
    change: 'changed',
    content: (
      <p>
        We ship on <DocumentDiffRemoved>Monday</DocumentDiffRemoved>
        <DocumentDiffAdded>Tuesday</DocumentDiffAdded> after the review.
      </p>
    ),
  },
  { change: 'added', content: <p>Pricing moves to the plans page.</p> },
  { change: 'removed', content: <p>The old pricing table.</p> },
  { change: 'same', content: <p>Questions go to the team room.</p> },
];

test('is a named group set as a document, every block in order', () => {
  render(<DocumentDiff blocks={BLOCKS} />);
  const group = screen.getByRole('group', { name: 'Changes' });
  expect(group.classList.contains('crewlet-document')).toBe(true);
  expect(group.classList.contains('crewlet-document--sm')).toBe(true);
  expect(group.classList.contains('crewlet-document--measure')).toBe(false);
  expect([...group.children].map((child) => child.className)).toEqual([
    'crewlet-document-diff__skip',
    'crewlet-document-diff__block crewlet-document-diff__block--changed',
    'crewlet-document-diff__block crewlet-document-diff__block--added',
    'crewlet-document-diff__block crewlet-document-diff__block--removed',
    'crewlet-document-diff__block crewlet-document-diff__block--same',
  ]);
});

test('marks only what changed inside a block, as ins and del read with their words', () => {
  render(<DocumentDiff blocks={BLOCKS} />);
  const removed = document.querySelector('del.crewlet-document-diff__removed');
  const added = document.querySelector('ins.crewlet-document-diff__added');
  expect(removed?.textContent).toBe('removed: Monday');
  expect(added?.textContent).toBe('added: Tuesday');
  const changed = document.querySelector('.crewlet-document-diff__block--changed p');
  expect(changed?.textContent).toBe('We ship on removed: Mondayadded: Tuesday after the review.');
});

test('a whole new or removed block is marked with a glyph nobody hears and a word somebody does', () => {
  render(<DocumentDiff blocks={BLOCKS} />);
  const added = document.querySelector('.crewlet-document-diff__block--added')!;
  const removed = document.querySelector('.crewlet-document-diff__block--removed')!;
  expect(added.querySelector('.crewlet-document-diff__mark')?.textContent).toBe('+');
  expect(added.querySelector('.crewlet-document-diff__mark')?.getAttribute('aria-hidden')).toBe('true');
  expect(added.querySelector('.crewlet-document-diff__content')?.textContent).toBe('Added:Pricing moves to the plans page.');
  expect(removed.querySelector('.crewlet-document-diff__mark')?.textContent).toBe('−');
  expect(removed.querySelector('.crewlet-document-diff__content')?.textContent).toBe('Removed:The old pricing table.');
  const same = document.querySelector('.crewlet-document-diff__block--same')!;
  expect(same.querySelector('.crewlet-document-diff__mark')?.textContent).toBe('');
  expect(same.querySelector('.crewlet-document-diff__content')?.textContent).toBe('Questions go to the team room.');
});

test('a folded run says how many blocks it stands for, and of what kind', () => {
  render(
    <DocumentDiff
      blocks={[
        { change: 'skipped', count: 1 },
        ...BLOCKS,
        { change: 'skipped', count: 4, of: 'removed' },
        { change: 'skipped', count: 1, of: 'added' },
      ]}
    />,
  );
  const rows = [...document.querySelectorAll('.crewlet-document-diff__skip')];
  expect(rows.map((row) => row.textContent)).toEqual([
    '1 unchanged paragraph',
    '2 unchanged paragraphs',
    '−4 more paragraphs removed',
    '+1 more paragraph added',
  ]);
  expect(rows.every((row) => row.querySelector('.crewlet-document-diff__mark')?.getAttribute('aria-hidden') === 'true')).toBe(true);
});

test('takes its words, a name and a size from the host', () => {
  render(
    <DocumentDiff
      blocks={BLOCKS}
      size="md"
      aria-label="The newest save"
      labels={{ addedWords: 'inserted:', removedWords: 'deleted:', skipped: (count, of) => `${count} ${of}` }}
    />,
  );
  const group = screen.getByRole('group', { name: 'The newest save' });
  expect(group.classList.contains('crewlet-document--md')).toBe(true);
  expect(group.querySelector('ins')?.textContent).toBe('inserted: Tuesday');
  expect(group.querySelector('del')?.textContent).toBe('deleted: Monday');
  expect(group.querySelector('.crewlet-document-diff__skip')?.textContent).toBe('2 same');
});

test('a mark outside a diff still says what it is', () => {
  render(
    <p>
      <DocumentDiffAdded>new</DocumentDiffAdded>
      <DocumentDiffRemoved>old</DocumentDiffRemoved>
    </p>,
  );
  expect(document.querySelector('ins')?.textContent).toBe('added: new');
  expect(document.querySelector('del')?.textContent).toBe('removed: old');
});

test('a mark reaches what the host drew inside it, a link among them', () => {
  render(
    <DocumentDiff
      blocks={[
        {
          change: 'changed',
          content: (
            <p>
              See the <DocumentDiffAdded><a href="#plans">plans page</a></DocumentDiffAdded>.
            </p>
          ),
        },
      ]}
    />,
  );
  expect(screen.getByRole('link', { name: 'plans page' }).closest('ins')?.className).toBe('crewlet-document-diff__added');
});

