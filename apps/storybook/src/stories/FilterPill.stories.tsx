import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, FilterPill, Popover } from '@crewlethq/ui';
import { ChevronDownGlyph, XGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof FilterPill> = {
  title: 'UI/FilterPill',
  component: FilterPill,
  args: { field: 'Status', operator: 'is', value: 'In progress' },
};

export default meta;
type Story = StoryObj<typeof FilterPill>;

/**
 * One filter in force, as the sentence it is: the field and the relation in
 * the secondary ink, the value in the accent ink at the semibold weight, a
 * step apart and with real spaces between them. The cross takes the filter
 * off and is named by the whole sentence.
 */
export const Basic: Story = {
  args: { onRemove: () => {} },
};

const START = [
  { key: 'status', field: 'Status', operator: 'is', value: 'In progress' },
  { key: 'q', field: 'Text', operator: 'contains', value: 'login' },
  { key: 'priority', field: 'Priority', operator: 'is at least', value: 'High' },
  { key: 'blocked', field: 'Blocked' },
  { key: 'assignee', field: 'Assignee', operator: 'is any of', value: 'Ada Okonkwo, Grace Lin, and 3 more people' },
] as const;

function Row() {
  const [pills, setPills] = useState<readonly (typeof START)[number][]>(START);
  return (
    <div role="group" aria-label="Filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)', maxWidth: 720 }}>
      {pills.map((pill) => (
        <FilterPill
          key={pill.key}
          field={pill.field}
          operator={'operator' in pill ? pill.operator : undefined}
          value={'value' in pill ? pill.value : undefined}
          onRemove={() => setPills((all) => all.filter((p) => p.key !== pill.key))}
        />
      ))}
      {pills.length > 0 ? (
        <Button size="small" variant="ghost" leadingIcon={<XGlyph size="sm" />} onClick={() => setPills([])}>
          Clear
        </Button>
      ) : (
        <Button size="small" variant="secondary" onClick={() => setPills(START)}>
          Reset
        </Button>
      )}
    </div>
  );
}

/**
 * A row of every field a list filters by: a relation per field, a switch with
 * no value, and a long value cut at the pill's edge. Every pill has the same
 * height, inset and remove control.
 */
export const EveryField: Story = { render: () => <Row /> };

/**
 * A pill whose words open the filter's editor (the way a DataView chip does):
 * `renderWords` hands over the words and the class the control takes, and the
 * caller makes them a popover trigger. No operator joins the field and the
 * value with a colon.
 */
export const WordsOpenAnEditor: Story = {
  render: () => (
    <FilterPill
      field="Seat"
      value="Ada Okonkwo"
      onRemove={() => {}}
      renderWords={(words, className) => (
        <Popover
          align="start"
          role="dialog"
          label="Seat filter"
          trigger={(open, toggle) => (
            <button type="button" className={className} aria-expanded={open} onClick={toggle}>
              {words}
              <ChevronDownGlyph size="xs" />
            </button>
          )}
        >
          <div style={{ padding: 'var(--spacing-3)' }}>The seat editor.</div>
        </Popover>
      )}
    />
  ),
};
