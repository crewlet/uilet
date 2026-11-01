import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock, CopyButton, Disclosure, InlineCode, Prose, Tag, Text } from '@crewlethq/ui';

const meta: Meta<typeof Disclosure> = {
  title: 'UI/Disclosure',
  component: Disclosure,
  args: { title: 'read_config', mono: true },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'aside'] },
    size: { control: 'inline-radio', options: ['default', 'compact'] },
    lazy: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Disclosure>;

const RECORD = '{\n  "path": "company.yaml",\n  "bytes": 4187\n}';

/**
 * A tool call: the name, how long it took, and the record it returned. The
 * copy control is a SIBLING of the toggle, because pressing it must not
 * collapse the very block it just copied.
 */
export const AToolCall: Story = {
  args: {
    meta: '0.4s',
    size: 'compact',
    headingLevel: 'none',
    actions: <CopyButton text={RECORD} />,
    children: <CodeBlock code={RECORD} plain selectable label="The read_config result, as JSON" />,
  },
  render: (args) => (
    <div style={{ maxWidth: 520 }}>
      <Disclosure {...args} />
    </div>
  ),
};

/**
 * Flush, under a line of text: a request's arguments under the sentence that
 * asks for it, the chevron and the JSON on the sentence's own edge rather than
 * a step in from it.
 */
export const FlushUnderAQuestion: Story = {
  render: () => (
    <div style={{ maxWidth: 520, display: 'grid', gap: 'var(--spacing-1)' }}>
      <Text as="p" variant="body">
        Call <InlineCode>create_pull_request</InlineCode> on GitHub?
      </Text>
      <Disclosure title="Arguments" size="compact" headingLevel="none" flush defaultOpen>
        <CodeBlock code={RECORD} plain selectable label="The call's arguments, as JSON" />
      </Disclosure>
    </div>
  ),
};

/**
 * An aside: what was considered rather than what was decided. The rule down
 * its edge is what lets a reader skip the block by its shape.
 */
export const AnAside: Story = {
  args: {
    variant: 'aside',
    size: 'compact',
    mono: false,
    title: 'Thinking',
    meta: '4.2s',
    headingLevel: 'none',
    children: (
      <Prose tone="muted">
        The reporting cycle in the company document decides which seat this belongs to, so I read it
        before answering.
      </Prose>
    ),
  },
  render: (args) => (
    <div style={{ maxWidth: 520 }}>
      <Disclosure {...args} />
    </div>
  ),
};

/** A section of a page, with a heading a reader can navigate to. */
export const ASection: Story = {
  args: {
    title: 'Advanced settings',
    mono: false,
    count: 6,
    defaultOpen: true,
    children: <Text as="p">Six settings nobody changes on the first day.</Text>,
  },
  render: (args) => (
    <div style={{ maxWidth: 520 }}>
      <Disclosure {...args} />
    </div>
  ),
};

/**
 * The head's register. It is the console's own expander: the caption size, the
 * chevron a step closer to its words than the words are to each other, and the
 * whole row on the secondary step until a pointer reaches it.
 *
 * The one thing it does NOT take from the dashboard is the row's height. At
 * 12px with 4px of padding the toggle would be a 20px target, under the 24px
 * WCAG 2.2 accepts, so the head keeps `--size-row-sm`, which floors at 24 at
 * every density.
 */
export const TheHeadRegister: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-1)', maxWidth: 420 }}>
      <Disclosure title="read_config" mono meta="182ms">
        <CodeBlock code={RECORD} plain />
      </Disclosure>
      <Disclosure title="search_knowledge" mono meta="1.4s">
        <Prose>Four pages matched, and two were already in the prompt.</Prose>
      </Disclosure>
      <Disclosure title="Thinking" variant="aside">
        <Prose tone="muted">
          The rule down the side is a margin, not a boundary: it is what lets a reader skip the
          block by its shape rather than by reading it.
        </Prose>
      </Disclosure>
    </div>
  ),
};

/**
 * A long fact beside a control, in a narrow column: a log's row on a settings
 * page, its replay mode, generation, range and size as the fact and its trim
 * status as the action. The fact gives up its room first and ends in an
 * ellipsis, so the title still says which log the row is, and nothing runs
 * out of the toggle under the badge beside it. The fact is still the
 * toggle's name in full.
 */
export const ALongFactInANarrowRow: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-1)', maxWidth: 340 }}>
      {['tracker', 'iam', 'pages'].map((log) => (
        <Disclosure
          key={log}
          title={log}
          mono
          size="compact"
          headingLevel="none"
          meta="replays from the snapshot, generation 14, 1201…48211, 1.6 MB"
          actions={
            <Tag variant="warning" appearance="soft">
              Held by the backup
            </Tag>
          }
        >
          <Prose>Six checks on how far the {log} log has been trimmed.</Prose>
        </Disclosure>
      ))}
    </div>
  ),
};
