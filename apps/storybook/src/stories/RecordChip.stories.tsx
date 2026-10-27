import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUpRightGlyph, BotGlyph, SquareKanbanGlyph, TableGlyph } from '@crewlethq/icons/glyphs';
import { ButtonLink, PropertyList, RecordChip, RecordChipList } from '@crewlethq/ui';

/**
 * A record named inside a sentence: a chip at the text's own size that opens a
 * peek with the record's name, a few facts and the way to it.
 */
const meta: Meta<typeof RecordChip> = {
  title: 'UI/RecordChip',
  component: RecordChip,
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 528,
          fontSize: 'var(--font-size-compact)',
          lineHeight: 'var(--font-line-height-relaxed)',
        }}
      >
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RecordChip>;

const task = (
  <RecordChip
    code="GOP-11"
    title="Android 12 crash when lesson audio starts"
    meta="Task · In progress"
    glyph={<SquareKanbanGlyph size="xs" />}
    actions={
      <ButtonLink href="#/work/GOP-11" variant="ghost" size="small" trailingIcon={<ArrowUpRightGlyph size="sm" />}>
        Open task
      </ButtonLink>
    }
  >
    <PropertyList
      groups={[
        {
          items: [
            { label: 'Assignee', value: 'Senior SWE, Mobile' },
            { label: 'Priority', value: 'Urgent' },
          ],
        },
      ]}
    />
  </RecordChip>
);

const agent = <RecordChip label="QA" title="QA" meta="Agent · Idle" glyph={<BotGlyph size="xs" />} />;

/** In a sentence of an answer: the line is no taller for holding two. */
export const InASentence: Story = {
  render: () => (
    <p>
      {task} asks whether to hold the beta: {agent} found the app closes on Android 12 when the first phrase&apos;s
      audio plays.
    </p>
  ),
};

/**
 * What the answer read but never named, on one quiet line under it: the same
 * chips, each opening the same peek.
 */
export const AlsoRead: Story = {
  render: () => (
    <RecordChipList label="Also read">
      <RecordChip
        key="waiting"
        label="Decisions waiting on you"
        title="Decisions waiting on you"
        meta="8 rows"
        glyph={<TableGlyph size="xs" />}
      />
      {agent}
    </RecordChipList>
  ),
};
