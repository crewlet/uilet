import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ToolCallLog, type ToolCallLogEntry } from '@crewlethq/ui';

/**
 * An agent's run as a reader follows it: narration in the body face, each tool
 * call as a row with its key argument and result, runs of like calls folded,
 * long inputs a click away. While live it follows the end, and a reader who
 * scrolls up gets a Jump to latest pill.
 */
const meta: Meta<typeof ToolCallLog> = {
  title: 'UI/ToolCallLog',
  component: ToolCallLog,
  decorators: [(Story) => <div style={{ maxWidth: 720 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ToolCallLog>;

const HEREDOC = [
  "python3 - <<'EOF'",
  'import json, pathlib',
  "rows = json.loads(pathlib.Path('report.json').read_text())",
  'for row in rows:',
  "    print(row['name'], row['passed'])",
  'EOF',
].join('\n');

const RUN: ToolCallLogEntry[] = [
  { kind: 'call', key: 'c1', tool: 'Crewlet · Get work item', detail: '{"item":"ENG-131"}', status: 'ok', durationMs: 310 },
  { kind: 'say', key: 's1', text: 'The item asks for a collection detail page. Reading the current page first.' },
  { kind: 'call', key: 'c2', tool: 'Read', detail: 'frontend/src/pages/CollectionDetail.jsx', status: 'ok', durationMs: 22 },
  { kind: 'call', key: 'c3', tool: 'Read', detail: 'frontend/src/pages/CollectionList.jsx', status: 'ok', durationMs: 18 },
  { kind: 'call', key: 'c4', tool: 'Read', detail: 'frontend/src/api/collections.js', status: 'ok', durationMs: 15 },
  { kind: 'call', key: 'c5', tool: 'Read', detail: 'frontend/src/pages/Missing.jsx', status: 'error', error: 'File does not exist.', durationMs: 9 },
  { kind: 'call', key: 'c6', tool: 'Edit', detail: 'frontend/src/pages/CollectionDetail.jsx', status: 'ok', durationMs: 41 },
  { kind: 'call', key: 'c7', tool: 'Bash', detail: "python3 - <<'EOF'", input: HEREDOC, status: 'ok', durationMs: 1840 },
  {
    kind: 'call',
    key: 'c8',
    tool: 'Bash',
    detail: 'gh pr view 131 -R example/app --json state,mergedAt,headRefName,baseRefName,reviewDecision,statusChecks…',
    input: 'gh pr view 131 -R example/app --json state,mergedAt,headRefName,baseRefName,reviewDecision,statusCheckRollup,commits',
    status: 'ok',
    durationMs: 2210,
  },
  { kind: 'say', key: 's2', text: 'All 363 pass. Now checking the new tests fail against the base without the component change.' },
  { kind: 'note', key: 'n1', text: 'A note was handed to the run: keep the old route working.', tone: 'warning' },
  { kind: 'call', key: 'c9', tool: 'Bash', detail: 'npm test -- CollectionDetail', status: 'running' },
];

/** A finished run: groups folded, one long input, a failure inside a group. */
export const Finished: Story = {
  args: { label: 'What the executor did', entries: RUN.slice(0, -1), copyText: 'the transcript as text' },
};

/** A live run: the last call still running, the log busy and following the end. */
export const Live: Story = {
  args: { label: 'Live output', entries: RUN, live: true, caption: 'read 3s ago', copyText: 'the transcript as text' },
};

/** A run that ended badly, with a gap the reader is told about. */
export const EndedWithError: Story = {
  args: {
    label: 'What the executor did',
    entries: [
      { kind: 'note', key: 'n0', text: '120 lines of output, 4 MiB, not read: past the bound one line may hold' },
      ...RUN.slice(0, 3),
      { kind: 'note', key: 'n2', text: 'The run ended: the model refused the request', tone: 'danger' },
    ],
  },
};

/** Calls arriving every second, bounded to a short view, to try following and Jump to latest. */
export const Streaming: Story = {
  render: function Streaming() {
    const [entries, setEntries] = useState<ToolCallLogEntry[]>(RUN.slice(0, 2));
    useEffect(() => {
      const timer = setInterval(() => {
        setEntries((was) => {
          const n = was.length;
          const next: ToolCallLogEntry =
            n % 4 === 0
              ? { kind: 'say', key: `s${n}`, text: `Step ${n}: the change compiles, moving on.` }
              : { kind: 'call', key: `c${n}`, tool: n % 3 === 0 ? 'Grep' : 'Bash', detail: `go test ./pkg/${n}/...`, status: 'ok', durationMs: 120 * n };
          return [...was, next];
        });
      }, 1000);
      return () => clearInterval(timer);
    }, []);
    return <ToolCallLog label="Live output" entries={entries} live maxHeight={240} caption="streaming" />;
  },
};

/** A phone-width column: details cut to one line, nothing scrolls sideways. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 358 }}>{Story()}</div>],
  args: { label: 'Live output', entries: RUN, live: true, copyText: 'x' },
};
