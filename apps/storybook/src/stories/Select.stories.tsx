import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select, type SelectOption, type SelectValue } from '@crewlethq/ui';

const fruits: SelectOption[] = [
  { value: 'apple', label: 'Apple', description: 'Red, crunchy' },
  { value: 'banana', label: 'Banana', description: 'Yellow, soft' },
  { value: 'cherry', label: 'Cherry', description: 'Small, sweet' },
  { value: 'durian', label: 'Durian', description: 'Spiky, controversial', disabled: true },
];

const seats: SelectOption[] = [
  { value: 'engineer', label: 'Software Engineer', group: 'Seats', description: 'software-engineer' },
  { value: 'sre', label: 'Site Reliability', group: 'Seats', description: 'site-reliability' },
  { value: 'designer', label: 'Designer', group: 'Seats', description: 'designer' },
  { value: 'engineering', label: 'Engineering', group: 'Units' },
  { value: 'gtm', label: 'Go to Market', group: 'Units' },
];

function Demo(props: Partial<React.ComponentProps<typeof Select>>) {
  const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('apple');
  return (
    <div style={{ width: 320 }}>
      <Select
        ariaLabel="Fruit"
        options={fruits}
        value={value}
        onChange={(next) => setValue(next)}
        {...props}
      />
    </div>
  );
}

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Basic: Story = { render: () => <Demo /> };

/**
 * A PICKER IN A TOOLBAR, which is not a field on a form: it sizes to the
 * answer it is showing, between a floor that keeps a row of them even and a
 * cap that stops one long value pushing the rest of the bar off the screen.
 * The one that is narrowing the list says so in the accent, border and ink
 * together, so a reader scanning the bar sees WHICH dimensions are set
 * without reading their values.
 */
export const ToolbarRow: Story = {
  render: () => {
    function Bar() {
      const [role, setRole] = useState<SelectValue | SelectValue[] | undefined>('');
      const [unit, setUnit] = useState<SelectValue | SelectValue[] | undefined>('engineering');
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Select
            ariaLabel="Role"
            width="auto"
            options={[{ value: '', label: 'Any role' }, ...seats]}
            value={role}
            active={role !== ''}
            onChange={(next) => setRole(next)}
          />
          <Select
            ariaLabel="Unit"
            width="auto"
            options={[{ value: '', label: 'Any unit' }, ...seats]}
            value={unit}
            active={unit !== ''}
            onChange={(next) => setUnit(next)}
          />
        </div>
      );
    }
    return <Bar />;
  },
};
export const Small: Story = { render: () => <Demo size="sm" /> };
export const Searchable: Story = { render: () => <Demo searchable options={seats} /> };
export const Disabled: Story = { render: () => <Demo disabled /> };

/** Groups, second lines, and a row that cannot be taken. */
export const Grouped: Story = {
  render: () => {
    function Grouped() {
      const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('engineer');
      return (
        <div style={{ width: 340 }}>
          <Select
            ariaLabel="Owner"
            options={seats}
            value={value}
            onChange={(next) => setValue(next)}
          />
        </div>
      );
    }
    return <Grouped />;
  },
};

export const Several: Story = {
  render: () => {
    function Several() {
      const [value, setValue] = useState<SelectValue | SelectValue[]>(['engineer', 'former-unit']);
      return (
        <div style={{ width: 340 }}>
          <Select
            multiple
            ariaLabel="Manages"
            placeholder="Nobody yet"
            options={seats}
            value={value}
            onChange={(next) => setValue(next)}
          />
          <p style={{ marginTop: 12, fontSize: 13 }}>
            "former-unit" is not on the list any more, and is still held.
          </p>
        </div>
      );
    }
    return <Several />;
  },
};

/**
 * THE ESCAPE HATCH, AND NOT THE DEFAULT. Every story above draws the listbox,
 * which is the house style: it takes the theme, the density, the tokens and
 * the layer stack, so a list opened in a dark dialog is drawn by the design
 * system rather than by the operating system.
 *
 * `mode="native"` is a real `<select>`, for the one thing the listbox cannot
 * have: the phone's own full-screen picker and the platform's assistive
 * behaviour inside a web view. A surface that is mostly read on a handset can
 * ask for it, and should say so where it does. `active` is the filter that is
 * on.
 */
export const Native: Story = {
  render: () => {
    function Native() {
      const [role, setRole] = useState<SelectValue | SelectValue[] | undefined>('');
      return (
        <div style={{ display: 'flex', gap: 12, width: 480 }}>
          <Select
            mode="native"
            ariaLabel="Role"
            placeholder="Any"
            active={role !== ''}
            options={[
              { value: '', label: 'Any' },
              { value: 'engineer', label: 'Software Engineer' },
              { value: 'sre', label: 'Site Reliability' },
            ]}
            value={role}
            onChange={(next) => setRole(next)}
          />
          <Select
            mode="native"
            size="sm"
            ariaLabel="Coverage"
            value="every-repository"
            onChange={() => {}}
            options={[
              { value: 'selected', label: 'Selected repositories' },
              { value: 'none', label: 'None' },
            ]}
          />
        </div>
      );
    }
    return <Native />;
  },
};
