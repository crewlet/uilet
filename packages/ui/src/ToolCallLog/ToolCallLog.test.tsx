/**
 * An agent's run as rows: narration apart from calls, each call's status in
 * words, its duration, a long input a click away, runs of like calls folded,
 * and a copy action only where there is text to copy.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ToolCallLog, toolCallDuration, type ToolCallLogCall, type ToolCallLogEntry } from './index.js';

afterEach(cleanup);

const call = (key: string, over: Partial<ToolCallLogCall> = {}): ToolCallLogCall => ({
  kind: 'call',
  key,
  tool: 'Read',
  detail: `src/${key}.tsx`,
  status: 'ok',
  ...over,
});

const HEREDOC = "python3 - <<'EOF'\nimport json\nprint(json.dumps({}))\nEOF";

const RUN: ToolCallLogEntry[] = [
  { kind: 'say', key: 's1', text: 'Checking the open pull request first.' },
  call('c1', { tool: 'Bash', detail: "python3 - <<'EOF'", input: HEREDOC, durationMs: 1234 }),
  call('c2', { tool: 'Read', detail: 'src/missing.tsx', status: 'error', error: 'File does not exist.', durationMs: 40 }),
  call('c3', { tool: 'Crewlet · Get work item', detail: undefined, status: 'running' }),
  { kind: 'note', key: 'n1', text: 'The run ended: out of budget', tone: 'danger' },
];

test('draws narration, calls and notes as distinct rows inside a named log', () => {
  const { container } = render(<ToolCallLog label="Live output" entries={RUN} />);
  const log = screen.getByRole('log', { name: 'Live output' });
  expect(within(log).getByText('Checking the open pull request first.').className).toContain('crewlet-tool-call-log__say');
  expect(container.querySelectorAll('.crewlet-tool-call-log__call')).toHaveLength(3);
  expect(within(log).getByText('Crewlet · Get work item').className).toContain('crewlet-tool-call-log__tool');
  const note = within(log).getByText('The run ended: out of budget').closest('p')!;
  expect(note.className).toContain('crewlet-tool-call-log__note--danger');
});

test("says each call's status in words, and its duration where known", () => {
  const { container } = render(<ToolCallLog label="Live output" entries={RUN} />);
  const [ran, failed, running] = [...container.querySelectorAll<HTMLElement>('.crewlet-tool-call-log__call')];
  expect(within(ran!).getByText('Succeeded')).toBeTruthy();
  expect(within(ran!).getByText('1.2s')).toBeTruthy();
  expect(within(failed!).getByText('Failed')).toBeTruthy();
  expect(within(failed!).getByText('File does not exist.').className).toContain('crewlet-tool-call-log__error');
  expect(within(failed!).getByText('40ms')).toBeTruthy();
  expect(within(running!).getByText('Running')).toBeTruthy();
  expect(running!.querySelector('.crewlet-spinner')).not.toBeNull();
  expect(running!.querySelector('.crewlet-tool-call-log__duration')).toBeNull();
});

test('a call with no result held is said so', () => {
  render(<ToolCallLog label="Log" entries={[call('c1', { status: 'unknown' })]} />);
  expect(screen.getByText('No result')).toBeTruthy();
});

test('a long input opens on demand, the toggle saying how much more and whether it is open', () => {
  render(<ToolCallLog label="Log" entries={RUN} />);
  const toggle = screen.getByRole('button', { name: '3 more lines' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
  expect(panel.hidden).toBe(true);
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(toggle.textContent).toBe('Show less');
  expect(panel.hidden).toBe(false);
  expect(panel.querySelector('pre')!.textContent).toBe(HEREDOC);
  fireEvent.click(toggle);
  expect(panel.hidden).toBe(true);
});

test('a one-line input the detail cut opens in full', () => {
  const long = `gh pr view 131 --json ${'state,'.repeat(40)}`;
  render(<ToolCallLog label="Log" entries={[call('c1', { tool: 'Bash', detail: `${long.slice(0, 40)}…`, input: long })]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Show in full' }));
  expect(screen.getByText(long)).toBeTruthy();
});

test('the toggle counts the lines the host did not keep, and the open input says so', () => {
  render(<ToolCallLog label="Log" entries={[call('c1', { tool: 'Bash', detail: 'python3 -', input: HEREDOC, inputUnkept: 12 })]} />);
  fireEvent.click(screen.getByRole('button', { name: '15 more lines' }));
  expect(screen.getByText('12 more lines were not kept.')).toBeTruthy();
});

test('an input that says no more than the detail has no toggle', () => {
  render(<ToolCallLog label="Log" entries={[call('c1', { input: 'src/c1.tsx' })]} />);
  expect(screen.queryByRole('button', { name: /more line|Show in full/ })).toBeNull();
});

test('a run of like calls folds into one row from the threshold, and opens to each call', () => {
  const reads = [call('a', { durationMs: 10 }), call('b', { durationMs: 20 }), call('c', { status: 'error', error: 'nope', durationMs: 30 })];
  const { container, rerender } = render(<ToolCallLog label="Log" entries={reads.slice(0, 2)} />);
  expect(container.querySelector('.crewlet-tool-call-log__group')).toBeNull();
  rerender(<ToolCallLog label="Log" entries={reads} />);
  const group = container.querySelector<HTMLElement>('.crewlet-tool-call-log__group')!;
  const toggle = within(group).getByRole('button', { name: 'Read · 3 calls' });
  expect(within(group).getByText('1 failed')).toBeTruthy();
  expect(within(group).getByText('60ms')).toBeTruthy();
  expect(within(group).getAllByText('Failed')).toHaveLength(1);
  expect(container.querySelectorAll('.crewlet-tool-call-log__call')).toHaveLength(0);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelectorAll('.crewlet-tool-call-log__call')).toHaveLength(3);
});

test('a group runs while any member runs, and shows no total until every member is timed', () => {
  const { container } = render(
    <ToolCallLog label="Log" entries={[call('a', { durationMs: 5 }), call('b'), call('c', { status: 'running' })]} />,
  );
  const group = container.querySelector<HTMLElement>('.crewlet-tool-call-log__group')!;
  expect(group.dataset.status).toBe('running');
  expect(group.querySelector('.crewlet-tool-call-log__duration')).toBeNull();
});

test('narration between like calls breaks the run, and a group key can join different labels', () => {
  const { container, rerender } = render(
    <ToolCallLog label="Log" entries={[call('a'), call('b'), { kind: 'say', key: 's', text: 'Now the tests.' }, call('c')]} />,
  );
  expect(container.querySelector('.crewlet-tool-call-log__group')).toBeNull();
  rerender(
    <ToolCallLog
      label="Log"
      entries={[call('a', { group: 'search' }), call('b', { tool: 'Grep', group: 'search' }), call('c', { tool: 'Glob', group: 'search' })]}
    />,
  );
  expect(screen.getByRole('button', { name: 'search · 3 calls' })).toBeTruthy();
});

test('groupAt sets the threshold', () => {
  const { container } = render(<ToolCallLog label="Log" groupAt={5} entries={[call('a'), call('b'), call('c'), call('d')]} />);
  expect(container.querySelector('.crewlet-tool-call-log__group')).toBeNull();
});

test('the copy action stands only where there is text to copy', () => {
  const { rerender } = render(<ToolCallLog label="Log" entries={RUN} />);
  expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  rerender(<ToolCallLog label="Log" entries={RUN} copyText="the transcript" />);
  expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
});

test('is busy while live, and carries its caption and bound', () => {
  const { container, rerender } = render(<ToolCallLog label="Log" entries={RUN} />);
  const log = screen.getByRole('log');
  expect(log.hasAttribute('aria-busy')).toBe(false);
  rerender(<ToolCallLog label="Log" entries={RUN} live caption="read 4s ago" maxHeight={300} />);
  expect(log.getAttribute('aria-busy')).toBe('true');
  expect(screen.getByText('read 4s ago')).toBeTruthy();
  const root = container.querySelector<HTMLElement>('.crewlet-tool-call-log')!;
  expect(root.style.getPropertyValue('--crewlet-tool-call-log-max-height')).toBe('300px');
});

test('every word is the host’s to change', () => {
  render(
    <ToolCallLog
      label="Ausgabe"
      copyText="x"
      entries={[...RUN, call('g1'), call('g2'), call('g3')]}
      labels={{
        moreLines: (n) => `${n} weitere Zeilen`,
        group: (tool, n) => `${tool}: ${n} Aufrufe`,
        ok: 'Erfolgreich',
        error: 'Fehlgeschlagen',
        running: 'Läuft',
        duration: (ms) => `${ms} ms`,
        copy: 'Kopieren',
      }}
    />,
  );
  expect(screen.getByRole('button', { name: '3 weitere Zeilen' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Read: 3 Aufrufe' })).toBeTruthy();
  expect(screen.getAllByText('Erfolgreich').length).toBeGreaterThan(0);
  expect(screen.getByText('Fehlgeschlagen')).toBeTruthy();
  expect(screen.getByText('Läuft')).toBeTruthy();
  expect(screen.getByText('1234 ms')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Kopieren' })).toBeTruthy();
});

test('durations read at the scale they are', () => {
  expect(toolCallDuration(450)).toBe('450ms');
  expect(toolCallDuration(1234)).toBe('1.2s');
  expect(toolCallDuration(42_000)).toBe('42s');
  expect(toolCallDuration(125_000)).toBe('2m 5s');
  expect(toolCallDuration(3_780_000)).toBe('1h 3m');
});

test('has no axe violations, open and folded', async () => {
  const { container } = render(
    <ToolCallLog label="Live output" copyText="x" live entries={[...RUN, call('g1'), call('g2'), call('g3')]} />,
  );
  fireEvent.click(screen.getByRole('button', { name: '3 more lines' }));
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
