import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUpRightGlyph, BotGlyph, SquareKanbanGlyph, TableGlyph } from '@crewlethq/icons/glyphs';
import { ButtonLink, DownloadButton, PropertyList, RecordChip, RecordChipList, Table } from '@crewlethq/ui';

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

/**
 * At the document's own leading (not the relaxed step the sentence story
 * uses): a chip is exactly one line tall, so the lines it sits on keep their
 * rhythm with the lines it does not. The key chip (GOP-11, mono at the micro
 * step) is the case that moved a line when the chip stood on the baseline;
 * it stands at the line's top.
 */
export const AtNormalLeading: Story = {
  decorators: [
    (Story) => (
      <div
        style={{ maxWidth: 528, fontSize: 'var(--font-size-compact)', lineHeight: 'var(--font-line-height-normal)' }}
      >
        {Story()}
      </div>
    ),
  ],
  render: () => (
    <p>
      Hold {task} or ship without it. {agent} recommends holding; the lines above and below a chip keep their spacing.
      Another line follows here, with no chip in it, to compare against.
    </p>
  ),
};

const later = (body: string) => () =>
  new Promise<Blob>((resolve) => setTimeout(() => resolve(new Blob([body], { type: 'text/csv' })), 600));

/** A list read on the Also read line: its peek holds the rows as a compact table, its downloads and the way to the page. */
export const PeekWithATable: Story = {
  render: () => (
    <RecordChipList label="Also read">
      <RecordChip
        key="waiting"
        label="Decisions waiting on you"
        title="Decisions waiting on you"
        meta="3 rows"
        glyph={<TableGlyph size="xs" />}
        actions={
          <>
            <ButtonLink href="#/inbox" variant="ghost" size="small" trailingIcon={<ArrowUpRightGlyph size="sm" />}>
              Open in Inbox
            </ButtonLink>
            <DownloadButton label="CSV" filename="decisions-waiting-on-you.csv" file={later('task,question\n')} />
          </>
        }
      >
        <Table
          framed={false}
          columns="content"
          nowrap={[true, false]}
          caption="Decisions waiting on you"
          captionHidden
          headers={['Task', 'Question']}
          data={[
            ['GOP-11', 'Ship the beta with the known Android 12 audio crash, or hold the release?'],
            ['GOP-10', 'Which sign-in methods ship in the beta?'],
            ['GOP-12', 'Which speech recognition service should score pronunciation?'],
          ]}
        />
      </RecordChip>
    </RecordChipList>
  ),
};

/** A label longer than its line is cut at the end, and its whole text is the chip's title. */
export const TruncatedLabel: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 240 }}>{Story()}</div>],
  render: () => (
    <RecordChipList label="Also read">
      <RecordChip
        key="pages"
        label="Pages, “brand colours logo typography design principles”"
        title="Pages, “brand colours logo typography design principles”"
        meta="6 rows"
        glyph={<TableGlyph size="xs" />}
      />
    </RecordChipList>
  ),
};

/** A peek with a line of context and nothing under it: the name and the meta, no empty body. */
export const MetaWithNoBody: Story = {
  render: () => (
    <p>
      <RecordChip label="QA" title="QA" meta="Agent · Idle" glyph={<BotGlyph size="xs" />} /> has nothing more to show.
    </p>
  ),
};
