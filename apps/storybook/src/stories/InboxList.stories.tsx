import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Avatar,
  Button,
  InboxGroup,
  InboxList,
  InboxMore,
  InboxRow,
  InboxToggle,
  Link,
  ReadingPane,
  ReadingPaneTitle,
  Tag,
} from '@crewlethq/ui';
import { CheckGlyph, MessageSquareGlyph } from '@crewlethq/icons/glyphs';

/**
 * The inbox's column. Each row names who it is from, says in up to three
 * lines what it is, and names the task under it as a quiet link of its own.
 * The open row takes the neutral pressed fill; the snoozed and earlier rows
 * open from two quiet toggles at the end rather than from a filter bar.
 */
const meta: Meta<typeof InboxList> = {
  title: 'UI/InboxList',
  component: InboxList,
};

export default meta;
type Story = StoryObj<typeof InboxList>;

interface Item {
  key: string;
  who: string;
  kind?: 'agent' | 'human';
  qualifier?: string;
  stopped?: boolean;
  when: string;
  text: string;
  excerpt?: string;
  task?: string;
  unread?: boolean;
  actionable?: boolean;
  done?: boolean;
}

const NEEDS: Item[] = [
  {
    key: 'ask-1',
    who: 'Crewlet-PM',
    when: '38m',
    text: 'Should settlement use greedy matching only, or an exact search that minimises the number of transfers?',
    task: 'FAIR-3 Ledger and settlement',
    actionable: true,
  },
  { key: 'run-1', who: 'Crewlet-SWE', qualifier: 'coding run', when: '1h', text: 'May I delete the fixtures directory?', task: 'FAIR-7 Split rules', actionable: true },
  { key: 'seat-1', who: 'Crewlet-QA', qualifier: 'stopped', stopped: true, when: '2h', text: 'Today’s token budget is spent', task: 'FAIR-9 Regression suite', actionable: true },
];

const UPDATES: Item[] = [
  { key: 'n-1', who: 'Jane Doe', kind: 'human', when: '3h', text: 'Mentioned you', excerpt: 'Can you check the rounding on the last line?', task: 'FAIR-3 Ledger and settlement', unread: true },
  { key: 'n-2', who: 'Crewlet-SWE', when: '1d', text: 'Moved to Done', task: 'FAIR-5 Currency picker' },
];

const SNOOZED: Item[] = [{ key: 'n-3', who: 'Crewlet-PM', when: 'back 9:00', text: 'Assigned you', task: 'FAIR-11 Receipts' }];

function Row({ item, open, onOpen }: { item: Item; open: string; onOpen: (key: string) => void }) {
  return (
    <InboxRow
      title={item.who}
      qualifier={item.qualifier}
      qualifierTone={item.stopped ? 'danger' : 'default'}
      meta={item.when}
      leading={<Avatar name={item.who} kind={item.kind ?? 'agent'} size={24} decorative />}
      excerpt={item.excerpt}
      unread={item.unread}
      actionable={item.actionable}
      done={item.done}
      doneLabel="Answered"
      selected={open === item.key}
      onClick={() => onOpen(item.key)}
      aside={
        item.task ? (
          <Link href={`#/worklet/${item.task.split(' ')[0]}`} variant="quiet" size="inherit">
            {item.task}
          </Link>
        ) : undefined
      }
    >
      {item.text}
    </InboxRow>
  );
}

function Column() {
  const [open, setOpen] = useState('ask-1');
  const [snoozed, setSnoozed] = useState(false);
  const [earlier, setEarlier] = useState(false);
  return (
    <div style={{ width: 340, padding: 'var(--spacing-2)', background: 'var(--color-surface-background)' }}>
      <InboxList label="Inbox">
        <InboxGroup label="Needs you">
          {NEEDS.map((item) => (
            <Row key={item.key} item={item} open={open} onOpen={setOpen} />
          ))}
        </InboxGroup>
        <InboxGroup label="Updates">
          {UPDATES.map((item) => (
            <Row key={item.key} item={item} open={open} onOpen={setOpen} />
          ))}
        </InboxGroup>
        <InboxMore>
          <InboxToggle expanded={snoozed} onClick={() => setSnoozed((v) => !v)}>
            1 snoozed
          </InboxToggle>
          <InboxToggle expanded={earlier} onClick={() => setEarlier((v) => !v)}>
            Earlier updates
          </InboxToggle>
        </InboxMore>
        {snoozed && (
          <InboxGroup label="Snoozed" hideLabel>
            {SNOOZED.map((item) => (
              <Row key={item.key} item={item} open={open} onOpen={setOpen} />
            ))}
          </InboxGroup>
        )}
        {earlier && (
          <InboxGroup label="Earlier updates" hideLabel>
            <Row
              item={{ key: 'n-0', who: 'Crewlet-PM', when: 'Mon', text: 'Ship the export first?', done: true }}
              open={open}
              onOpen={setOpen}
            />
          </InboxGroup>
        )}
      </InboxList>
    </div>
  );
}

export const Default: Story = {
  render: () => <Column />,
};

/**
 * Nothing is cut at the edge: the name ellipsizes, the time never wraps, and
 * the words take up to three lines, even when they hold a word with no break.
 */
export const LongWords: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <InboxList label="Inbox">
        <InboxGroup label="Needs you">
          <InboxRow
            title="Crewlet-Principal-Engineer-With-A-Long-Name"
            meta="12m"
            actionable
            onClick={() => {}}
            aside={
              <Link href="#/worklet/FAIR-42" variant="quiet" size="inherit">
                FAIR-42 settlement/strategies/exact-search-with-transfer-minimisation
              </Link>
            }
          >
            Should_we_rename_the_settlement_strategy_flag_to_something_shorter_before_the_release_or_keep_it_for_compatibility
          </InboxRow>
        </InboxGroup>
      </InboxList>
    </div>
  ),
};

/**
 * What came of a settled row, said rather than struck: the words step down to
 * the secondary ink and stay legible, `outcome` says what was decided on a
 * line of its own, and `status` names the state in the head. A row answered a
 * moment ago stays where it stood, marked; older answers wait in a closed,
 * counted group whose label is a disclosure inside the heading.
 */
export const Answered: Story = {
  render: function Render() {
    const [open, setOpen] = useState('done-1');
    const task = (label: string) => (
      <Link href={`#/worklet/${label.split(' ')[0]}`} variant="quiet" size="inherit">
        {label}
      </Link>
    );
    const answered = (
      <Tag size="xs" variant="success" appearance="soft" leadingIcon={<CheckGlyph size="sm" />}>
        Answered
      </Tag>
    );
    return (
      <div style={{ width: 340, padding: 'var(--spacing-2)', background: 'var(--color-surface-background)' }}>
        <InboxList label="Inbox">
          <InboxGroup label="Needs you" count={1}>
            <InboxRow
              title="Crewlet-PM"
              leading={<Avatar name="Crewlet-PM" kind="agent" size={24} decorative />}
              done
              doneLabel="Answered"
              status={answered}
              outcome={
                <>
                  You chose <strong>One JSON file per group</strong>
                </>
              }
              outcomeIcon={<CheckGlyph size="sm" />}
              outcomeTone="success"
              selected={open === 'done-1'}
              onClick={() => setOpen('done-1')}
              aside={task('FAIR-1 Product brief and MVP backlog')}
            >
              How should the MVP store a group&rsquo;s data locally?
            </InboxRow>
            <InboxRow
              title="Crewlet-PM"
              meta="Sun"
              leading={<Avatar name="Crewlet-PM" kind="agent" size={24} decorative />}
              actionable
              selected={open === 'ask-2'}
              onClick={() => setOpen('ask-2')}
              aside={task('FAIR-1 Product brief and MVP backlog')}
            >
              Should the MVP support unequal splits, or equal splits only?
            </InboxRow>
          </InboxGroup>
          <InboxGroup label="Answered" count={2} collapsible defaultOpen>
            <InboxRow
              title="Crewlet-SWE"
              meta="35m"
              leading={<Avatar name="Crewlet-SWE" kind="agent" size={24} decorative />}
              done
              doneLabel="Answered"
              outcome={
                <>
                  You replied <strong>&ldquo;Allow spaces, but trim them at both ends.&rdquo;</strong>
                </>
              }
              outcomeIcon={<MessageSquareGlyph size="sm" />}
              outcomeTone="success"
              selected={open === 'done-2'}
              onClick={() => setOpen('done-2')}
              aside={task("FAIR-5 Store a group's data locally")}
            >
              Can a group&rsquo;s name contain spaces?
            </InboxRow>
            <InboxRow
              title="Crewlet-PM"
              meta="1h"
              leading={<Avatar name="Crewlet-PM" kind="agent" size={24} decorative />}
              done
              doneLabel="Answered"
              outcome={
                <>
                  Dana Reyes chose <strong>The person who paid</strong>
                </>
              }
              outcomeIcon={<CheckGlyph size="sm" />}
              outcomeTone="success"
              selected={open === 'done-3'}
              onClick={() => setOpen('done-3')}
              aside={task('FAIR-4 Split amounts exact to the cent')}
            >
              Who should receive the leftover cent when an amount does not split evenly?
            </InboxRow>
          </InboxGroup>
        </InboxList>
      </div>
    );
  },
};

const QUESTIONS = [
  { key: 'q1', who: 'Crewlet-PM', text: 'Which ledger should a shared expense post to?' },
  { key: 'q2', who: 'Crewlet-Dev', text: 'Can a group name contain spaces?' },
  { key: 'q3', who: 'Crewlet-QA', text: 'Should a settled group stay visible on the home page?' },
] as const;

/**
 * ANSWERING MOVES ON. Answer the open question: its row leaves Needs you,
 * inert while its height closes so the rows under it slide up, lands in the
 * closed Answered group (its label and count take a brief wash), and the
 * pane plays the next question in and puts focus on its title. The host only
 * moves the row between groups and names the next item; the motion is the
 * kit's, and under reduced motion every step is instant.
 */
export const AnsweringMovesOn: Story = {
  render: function AnsweringMovesOnStory() {
    const [waiting, setWaiting] = useState<string[]>(QUESTIONS.map((q) => q.key));
    const [answered, setAnswered] = useState<string[]>([]);
    const [open, setOpen] = useState<string>(QUESTIONS[0].key);
    const item = QUESTIONS.find((q) => q.key === open)!;
    const answer = () => {
      const next = waiting.find((key) => key !== open);
      setWaiting((was) => was.filter((key) => key !== open));
      setAnswered((was) => [open, ...was]);
      if (next) setOpen(next);
    };
    const row = (key: string, done: boolean) => {
      const q = QUESTIONS.find((each) => each.key === key)!;
      return (
        <InboxRow
          key={key}
          title={q.who}
          meta="2m"
          leading={<Avatar name={q.who} kind="agent" size={24} decorative />}
          actionable={!done}
          done={done}
          doneLabel="Answered"
          selected={open === key}
          onClick={() => setOpen(key)}
        >
          {q.text}
        </InboxRow>
      );
    };
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--spacing-5)', maxWidth: 960 }}>
        <InboxList label="Inbox">
          <InboxGroup label="Needs you" count={waiting.length}>
            {waiting.map((key) => row(key, false))}
          </InboxGroup>
          <InboxGroup label="Answered" count={answered.length} collapsible arrived={answered[0]}>
            {answered.map((key) => row(key, true))}
          </InboxGroup>
        </InboxList>
        <ReadingPane contentKey={open}>
          <ReadingPaneTitle>{item.text}</ReadingPaneTitle>
          <p style={{ margin: 0 }}>Asked by {item.who}.</p>
          {waiting.includes(open) ? (
            <div>
              <Button onClick={answer}>Answer</Button>
            </div>
          ) : null}
        </ReadingPane>
      </div>
    );
  },
};
