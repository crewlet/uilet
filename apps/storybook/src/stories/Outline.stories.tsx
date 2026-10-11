import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document, Outline, scrollToHeading, useActiveHeading, type OutlineItem } from '@crewlethq/ui';

/**
 * UI / Outline.
 *
 * "On this page": the headings of the document beside it. Scroll the page and
 * the entry for the section in view takes the accent edge; press an entry and
 * the page moves to that heading and puts focus on it, so a keyboard reads on
 * from there. The entries are buttons rather than anchors, because a hash
 * router keeps its own route in the fragment.
 */
const meta: Meta<typeof Outline> = {
  title: 'UI/Outline',
  component: Outline,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Outline>;

const ITEMS: OutlineItem[] = [
  { id: 'story-net-balances', label: 'Net balances', level: 2 },
  { id: 'story-greedy', label: 'Greedy simplification', level: 2 },
  { id: 'story-ties', label: 'Ties and determinism', level: 2 },
  { id: 'story-worked', label: 'Worked example', level: 2 },
  { id: 'story-why', label: 'Why not the exact minimum', level: 2 },
  { id: 'story-comparison', label: 'Comparison on test groups', level: 3 },
];

const PARAGRAPH =
  'Each payment settles at least one member, so a group of n members with non-zero balances needs at most n minus one payments. When two members have the same balance, the one whose name sorts first goes first, so the same ledger always prints the same payments.';

function Reading() {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const active = useActiveHeading(
    ITEMS.map((item) => item.id),
    { root, offset: 24 },
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 'var(--spacing-6)', height: 420 }}>
      <Outline label="On this page" items={ITEMS} activeId={active} onSelect={(id) => scrollToHeading(id)} />
      <div ref={setRoot} style={{ overflowY: 'auto', paddingInlineEnd: 'var(--spacing-4)' }}>
        <Document>
          {ITEMS.map((item) => {
            const Heading = item.level === 3 ? 'h3' : 'h2';
            return [
              <Heading key={item.id} id={item.id}>
                {item.label}
              </Heading>,
              <p key={`${item.id}-1`}>{PARAGRAPH}</p>,
              <p key={`${item.id}-2`}>{PARAGRAPH}</p>,
            ];
          })}
        </Document>
      </div>
    </div>
  );
}

/** Beside a page that scrolls in its own box, following the reader. */
export const OnThisPage: Story = {
  render: () => <Reading />,
};

/** The current entry alone, as a screen reader hears it: `aria-current="location"`. */
export const Current: Story = {
  args: { label: 'On this page', items: ITEMS, activeId: 'story-ties', onSelect: () => {} },
};
