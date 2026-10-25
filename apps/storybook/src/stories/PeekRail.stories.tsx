import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  AppShell,
  Button,
  PEEK_RAIL_MAX_WIDTH,
  PEEK_RAIL_MIN_WIDTH,
  PEEK_RAIL_WIDTH,
  PeekHost,
  PeekNeighbours,
  PeekRail,
  Stack,
  Text,
  peekClickHandler,
  usePeekNeighbours,
  useStoredWidth,
  type AppShellPeekShape,
} from '@crewlethq/ui';

/*
 * The peek: one object beside the list it was opened from, mounted once by
 * the frame. A list publishes its order, the rail steps through it, and the
 * host keeps the address, the keys and the body for each kind of object.
 */

const meta: Meta<typeof PeekRail> = {
  title: 'UI/PeekRail',
  component: PeekRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof PeekRail>;

const TASKS = [
  { token: 'task:ENG-12', key: 'ENG-12', title: 'Rotate the signing key before the audit' },
  { token: 'task:ENG-9', key: 'ENG-9', title: 'Write the backup runbook' },
  { token: 'task:ENG-14', key: 'ENG-14', title: 'Audit the token grants' },
  { token: 'task:ENG-15', key: 'ENG-15', title: 'Move the storage quotas to File storage' },
];

function TaskList({ onPeek }: { onPeek: (token: string) => void }) {
  usePeekNeighbours(TASKS.map((task) => task.token), { list: 'mine' });
  return (
    <Stack gap={1}>
      {TASKS.map((task) => (
        <a key={task.token} href={`#/work/${task.key}`} onClick={peekClickHandler(() => onPeek(task.token))}>
          {task.key} {task.title}
        </a>
      ))}
      <Text variant="caption">A plain press peeks; a modified or middle press opens the page in a tab.</Text>
    </Stack>
  );
}

function Frame({ shape }: { shape: AppShellPeekShape }) {
  const [current, setCurrent] = useState<string | null>(TASKS[0]!.token);
  const stored = useStoredWidth({ key: 'crewlet.storybook.peek.width', min: PEEK_RAIL_MIN_WIDTH, max: PEEK_RAIL_MAX_WIDTH });
  return (
    <PeekNeighbours>
      <AppShell
        topbar={<AppShell.Topbar title="Work" />}
        peekShape={shape}
        peek={
          <PeekHost
            current={current}
            label={() => 'Task detail'}
            render={(token) => {
              const task = TASKS.find((t) => t.token === token);
              return task ? (
                <Stack gap={2} style={{ paddingTop: 'var(--spacing-4)' }}>
                  <Text variant="caption" mono>
                    {task.key}
                  </Text>
                  <Text>{task.title}</Text>
                </Stack>
              ) : undefined;
            }}
            onClose={() => setCurrent(null)}
            onMove={setCurrent}
            openHref={(token, query) => `#/work/${token.slice(5)}${query ? `?${new URLSearchParams({ ...query })}` : ''}`}
            width={stored.width ?? PEEK_RAIL_WIDTH}
            reserve={444}
            onWidthChange={stored.setWidth}
            onWidthCommit={stored.commitWidth}
            labels={{ previousHint: 'Previous ([)', nextHint: 'Next (])', closeHint: 'Close (esc)' }}
          />
        }
      >
        <TaskList onPeek={setCurrent} />
        {current === null ? (
          <div>
            <Button variant="secondary" size="small" onClick={() => setCurrent(TASKS[0]!.token)}>
              Peek the first task
            </Button>
          </div>
        ) : null}
      </AppShell>
    </PeekNeighbours>
  );
}

/**
 * A COLUMN of the sheet beside the scroller, under the bar. Previous and Next
 * step through the list's order; the grip in its edge sizes it by pointer or
 * keyboard, capped so the list keeps 444px.
 */
export const ColumnBesideTheList: Story = { render: () => <Frame shape="column" /> };

/** A DRAWER over the page, behind a veil a press on which closes it. The list stays live. */
export const DrawerOverThePage: Story = { render: () => <Frame shape="drawer" /> };

/** The rail alone, with every control, outside a shell. */
export const Rail: Story = {
  render: () => (
    <div style={{ display: 'flex', height: '24rem' }}>
      <div style={{ flex: 1 }} />
      <PeekRail label="Task detail" onClose={() => {}} onStep={() => {}} openHref="#/work/ENG-12" onWidthChange={() => {}}>
        <Text>ENG-12</Text>
      </PeekRail>
    </div>
  ),
};
