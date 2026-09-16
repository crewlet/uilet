import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FilterChip, FilterChipGroup } from '@crewlethq/ui';

const meta: Meta<typeof FilterChip> = {
  title: 'UI/FilterChip',
  component: FilterChip,
  args: { children: 'Errors', count: 12 },
  argTypes: {
    pressed: { control: 'boolean' },
    count: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FilterChip>;

/**
 * NEUTRAL UNTIL IT IS ON, and then the accent. The accent means where the
 * reader is, and the filter currently narrowing a list is exactly that, so it
 * is the one control in a toolbar entitled to the colour. At rest the chip is
 * the quiet step at the regular weight: a row of options is scanned rather
 * than read, and the one that is on is the only thing in it saying so.
 */
export const Basic: Story = {
  render: function OneChip(args) {
    const [on, setOn] = useState(false);
    return <FilterChip {...args} pressed={on} onPressedChange={setOn} />;
  },
};

/**
 * Several filters at once. Each chip is an independent switch and Tab reaches
 * every one, which is what `aria-pressed` tells a screen reader it is.
 */
export const Toggles: Story = {
  render: function Toggles() {
    const [on, setOn] = useState<Record<string, boolean>>({ errors: true });
    const chip = (key: string, label: string, count: number) => (
      <FilterChip
        key={key}
        count={count}
        pressed={on[key] === true}
        onPressedChange={(next) => setOn((all) => ({ ...all, [key]: next }))}
      >
        {label}
      </FilterChip>
    );
    return (
      <FilterChipGroup label="Severity">
        {chip('errors', 'Errors', 12)}
        {chip('warnings', 'Warnings', 4)}
        {chip('notices', 'Notices', 38)}
      </FilterChipGroup>
    );
  },
};

/**
 * One choice. The arrows move and choose, as the platform's own radio group
 * does, and the whole row is a single tab stop.
 */
export const OneChoice: Story = {
  render: function OneChoice() {
    const [value, setValue] = useState<string | null>('decision');
    return (
      <FilterChipGroup label="Event kind" semantics="radio" value={value} onValueChange={setValue}>
        <FilterChip value="decision" count={12}>
          Decision
        </FilterChip>
        <FilterChip value="delivery" count={4}>
          Delivery
        </FilterChip>
        <FilterChip value="fault" count={0}>
          Fault
        </FilterChip>
      </FilterChipGroup>
    );
  },
};

/**
 * With `allowNone`, a second press on the chosen chip clears it. For a row
 * with no explicit "All" chip to go back to.
 */
export const WithANoneState: Story = {
  render: function WithANoneState() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <FilterChipGroup label="Seat" semantics="radio" value={value} onValueChange={setValue} allowNone>
          <FilterChip value="ceo">CEO</FilterChip>
          <FilterChip value="cto">CTO</FilterChip>
          <FilterChip value="swe">Software Engineer</FilterChip>
        </FilterChipGroup>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
          Filtering by: {value ?? 'nothing'}
        </span>
      </div>
    );
  },
};
