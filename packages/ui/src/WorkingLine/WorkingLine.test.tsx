/**
 * Every agent at work on one line: the faces, one sentence for one, two or
 * many agents, queued agents counted and still, one announcement per change
 * of who, the per-agent lines on demand, and every motion stopped under
 * reduced motion.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { WorkingLine, workingAnnouncement, workingSentence, type WorkingAgent } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'WorkingLine.css'), 'utf8');

const backend: WorkingAgent = { id: 'swe', name: 'Backend Engineer', character: 'gemlet', hue: 'cyan', status: 'is mulling it over...' };
const app: WorkingAgent = { id: 'app', name: 'App Engineer', character: 'hexlet', hue: 'purple', status: 'is crewleting...' };
const crew: WorkingAgent[] = [
  backend,
  app,
  { id: 'pm', name: 'Product Manager', status: 'is thinking...' },
  { id: 'qa', name: 'QA Engineer', status: 'is working on it...' },
  { id: 'ux', name: 'Designer', status: 'is scheming...' },
  { id: 'sre', name: 'Site Reliability Engineer', status: 'is on it...' },
];

describe('workingSentence', () => {
  test('one agent keeps its own phrase, without the ellipsis the dots replace', () => {
    expect(workingSentence([backend])).toMatchObject({ names: 'Backend Engineer', verb: 'is mulling it over', queued: '', everyone: true });
    expect(workingSentence([{ ...backend, status: 'is thinking…' }]).verb).toBe('is thinking');
    expect(workingSentence([{ ...backend, status: '' }]).verb).toBe('is working');
  });

  test('two share one verb, and three or more name the first two and count the rest', () => {
    expect(workingSentence([backend, app])).toMatchObject({ names: 'Backend Engineer and App Engineer', verb: 'are working', everyone: true });
    expect(workingSentence([backend, app]).others).toBe('');
    expect(workingSentence(crew.slice(0, 3))).toMatchObject({ names: 'Backend Engineer, App Engineer', others: 'and 1 other', everyone: false });
    expect(workingSentence(crew)).toMatchObject({ names: 'Backend Engineer, App Engineer', others: 'and 4 others', count: '6 agents', verb: 'are working' });
    expect(workingSentence([backend, app]).count).toBe('');
  });

  test('agents at work lead and queued ones are counted; queued ones lead only when none has started', () => {
    const waiting = { ...app, queued: true, status: 'is queued behind its current task' };
    expect(workingSentence([backend, waiting])).toMatchObject({ names: 'Backend Engineer', verb: 'is mulling it over', queued: '1 queued', everyone: false, waiting: false });
    expect(workingSentence([waiting])).toMatchObject({ names: 'App Engineer', verb: 'is queued behind its current task', waiting: true });
    expect(workingSentence([waiting, { ...backend, queued: true }])).toMatchObject({ verb: 'are queued', queued: '', waiting: true });
  });

  test('takes another language through its labels', () => {
    const sentence = workingSentence(crew, { working: 'arbeiten', others: (count) => `und ${count} weitere`, series: (names) => names.join(' + ') });
    expect(sentence).toMatchObject({ names: 'Backend Engineer + App Engineer', others: 'und 4 weitere', verb: 'arbeiten' });
  });
});

test('announces every name at work and queued, and never a phrase', () => {
  expect(workingAnnouncement([backend])).toBe('Backend Engineer is working.');
  expect(workingAnnouncement([backend, app, { ...crew[2]!, queued: true }])).toBe('Backend Engineer and App Engineer are working. Product Manager is queued.');
  expect(workingAnnouncement([])).toBe('');
});

test('draws one line: the faces at 20px, then the sentence and the dots', () => {
  const { container } = render(<WorkingLine agents={crew} />);
  const summary = container.querySelector('.crewlet-working-line__summary')!;
  const stack = summary.querySelector('.crewlet-avatar-stack')!;
  // 20px faces at the stack's own 6px overlap, not the xs step's 2px.
  expect(stack.classList.contains('crewlet-avatar-stack--xs')).toBe(false);
  expect((stack as HTMLElement).style.getPropertyValue('--crewlet-avatar-stack-size')).toBe('20px');
  // Three faces and the count of the rest.
  expect(stack.querySelectorAll('.crewlet-avatar')).toHaveLength(3);
  expect(stack.querySelector('.crewlet-avatar-stack__more')!.textContent).toBe('+3');
  expect(summary.querySelector('.crewlet-working-line__names')!.textContent).toBe('Backend Engineer, App Engineer');
  // The count is its own piece, so a narrow column truncates the names and never the count.
  expect(summary.querySelector('.crewlet-working-line__others')!.textContent).toBe('and 4 others');
  // The counted form stands ready for a narrow line, where the stylesheet swaps it in.
  const who = summary.querySelector('.crewlet-working-line__who')!;
  expect(who.classList.contains('is-counted')).toBe(true);
  expect(who.querySelector('.crewlet-working-line__count')!.textContent).toBe('6 agents');
  expect(summary.querySelector('.crewlet-working-line__verb')!.textContent).toBe('are working');
  expect(summary.querySelectorAll('.crewlet-bouncing-dots > i')).toHaveLength(3);
  expect(summary.querySelector('.crewlet-bouncing-dots')!.getAttribute('aria-hidden')).toBe('true');
});

test('names every face in the stack where the sentence counts them, and leaves it silent where the sentence names them all', () => {
  const { container, rerender } = render(<WorkingLine agents={crew} />);
  const stack = () => container.querySelector('.crewlet-avatar-stack')!;
  expect(stack().getAttribute('role')).toBe('img');
  expect(stack().getAttribute('aria-label')).toBe(
    'Backend Engineer, App Engineer, Product Manager, QA Engineer, Designer and Site Reliability Engineer',
  );
  rerender(<WorkingLine agents={[backend, app]} />);
  expect(stack().getAttribute('aria-hidden')).toBe('true');
  expect(stack().getAttribute('role')).toBeNull();
});

test('fades a new phrase in by keying it on its words', () => {
  const { container, rerender } = render(<WorkingLine agents={[backend]} />);
  const before = container.querySelector('.crewlet-working-line__verb')!;
  rerender(<WorkingLine agents={[backend]} />);
  expect(container.querySelector('.crewlet-working-line__verb')).toBe(before);
  rerender(<WorkingLine agents={[{ ...backend, status: 'is thinking...' }]} />);
  const after = container.querySelector('.crewlet-working-line__verb')!;
  expect(after).not.toBe(before);
  expect(after.textContent).toBe('is thinking');
});

test('keeps one polite region that changes with who is at work, not with their phrases', () => {
  const { container, rerender } = render(<WorkingLine agents={[]} />);
  const region = screen.getByRole('status');
  expect(region.textContent).toBe('');
  expect(container.firstElementChild!.classList.contains('is-idle')).toBe(true);
  rerender(<WorkingLine agents={[backend]} />);
  expect(screen.getAllByRole('status')).toEqual([region]);
  expect(region.textContent).toBe('Backend Engineer is working.');
  rerender(<WorkingLine agents={[{ ...backend, status: 'is thinking...' }]} />);
  expect(region.textContent).toBe('Backend Engineer is working.');
  rerender(<WorkingLine agents={crew} />);
  // Still one region for six agents, and still the same element.
  expect(screen.getAllByRole('status')).toEqual([region]);
  expect(region.textContent).toBe(
    'Backend Engineer, App Engineer, Product Manager, QA Engineer, Designer and Site Reliability Engineer are working.',
  );
});

test('stays quiet where another line announces the same agents', () => {
  render(<WorkingLine agents={crew} announce={false} />);
  expect(screen.queryByRole('status')).toBeNull();
});

test('opens one compact line per agent from a toggle, queued agents included', () => {
  const agents = [backend, { ...app, queued: true, status: 'is queued behind its current task' }];
  const { container } = render(<WorkingLine agents={agents} />);
  const toggle = screen.getByRole('button', { name: 'Each agent at work' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(container.querySelector('.crewlet-working-line__detail')).toBeNull();
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const list = screen.getByRole('list', { name: 'Each agent at work' });
  expect(toggle.getAttribute('aria-controls')).toBe(list.id);
  const rows = [...list.querySelectorAll('li')];
  expect(
    rows.map((row) => [
      row.querySelector('.crewlet-working-line__agent-name')!.textContent,
      row.querySelector('.crewlet-working-line__agent-phrase')!.textContent,
    ]),
  ).toEqual([
    ['Backend Engineer', 'is mulling it over'],
    ['App Engineer', 'is queued behind its current task'],
  ]);
  expect(rows[1]!.classList.contains('is-queued')).toBe(true);
  for (const row of rows) expect(row.querySelector('.crewlet-avatar')!.getAttribute('aria-hidden')).toBe('true');
  fireEvent.click(toggle);
  expect(container.querySelector('.crewlet-working-line__detail')).toBeNull();
});

test('offers no toggle for one agent, whose line already says everything', () => {
  render(<WorkingLine agents={[backend]} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('draws a line of queued agents still: no dots, and the queued state for the stylesheet', () => {
  const { container } = render(<WorkingLine agents={[{ ...backend, queued: true }]} />);
  expect(container.firstElementChild!.classList.contains('is-queued')).toBe(true);
  expect(container.querySelector('.crewlet-bouncing-dots')).toBeNull();
  expect(css).toMatch(/\.crewlet-working-line\.is-queued \.crewlet-working-line__who \{[^}]*animation: none;/);
});

test('counts three or more agents on a line under 21rem, and takes its column for that measure', () => {
  expect(css).toMatch(/\.crewlet-working-line \{[^}]*container: crewlet-working-line \/ inline-size;[^}]*width: 100%;/);
  expect(css).toMatch(/\.crewlet-working-line__count \{\s*display: none;/);
  const narrow = /@container crewlet-working-line \(max-width: 21rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(narrow).toMatch(/\.is-counted > \.crewlet-working-line__names,\s*[^{]*\.is-counted > \.crewlet-working-line__others \{\s*display: none;/);
  expect(narrow).toMatch(/\.is-counted > \.crewlet-working-line__count \{\s*display: block;/);
});

test('sweeps a band across the names, left to right, then rests', () => {
  expect(css).toMatch(/animation: crewlet-working-line-sweep var\(--motion-duration-breath\) linear infinite;/);
  expect(css).toMatch(/@keyframes crewlet-working-line-sweep \{\s*0% \{\s*background-position: 150% 0;\s*\}\s*70%,\s*100% \{\s*background-position: -50% 0;/);
  // The band is the primary ink over the secondary, both tokens, in both palettes.
  expect(css).toMatch(/var\(--color-text-secondary\) 43%,\s*var\(--color-text-primary\) 50%,\s*var\(--color-text-secondary\) 57%/);
});

test('stops every motion under reduced motion', () => {
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  for (const selector of [
    '.crewlet-working-line__who',
    '.crewlet-working-line__verb',
    '.crewlet-working-line__agent-phrase',
    '.crewlet-bouncing-dots > i',
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&');
    expect(reduced).toMatch(new RegExp(`${escaped} \\{[^}]*animation: none;`));
  }
  expect(reduced).toMatch(/\.crewlet-working-line__chevron \{[^}]*transition: none;/);
  // Still, the names keep a readable ink rather than the transparent fill the sweep clips.
  expect(reduced).toMatch(/\.crewlet-working-line__who \{[^}]*background-image: none;\s*color: var\(--color-text-primary\);/);
});

test('carries no axe violation, closed and open', async () => {
  const { container } = render(
    <main>
      <WorkingLine agents={crew} />
      <WorkingLine agents={[backend, { ...app, queued: true }]} defaultExpanded />
      <WorkingLine agents={[backend]} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
