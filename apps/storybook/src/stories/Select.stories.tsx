import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FormField, Select, StatusDot, type SelectOption, type SelectValue } from '@crewlethq/ui';
import { BotGlyph, NetworkGlyph, UserGlyph } from '@crewlethq/icons/glyphs';

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
/**
 * QUIET: the same pickers with no boundary until the pointer is over one,
 * for a toolbar whose pickers arrange content that is the page's point (a
 * gallery's type and order above its cards). The one narrowing the list
 * takes the accent's soft fill under its accent ink.
 */
export const QuietToolbar: Story = {
  render: () => {
    function Bar() {
      const [kind, setKind] = useState<SelectValue | SelectValue[] | undefined>('sheet');
      const [order, setOrder] = useState<SelectValue | SelectValue[] | undefined>('updated');
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            ariaLabel="Type"
            size="sm"
            width="auto"
            appearance="quiet"
            options={[
              { value: '', label: 'Every type' },
              { value: 'doc', label: 'Doc' },
              { value: 'sheet', label: 'Sheet' },
            ]}
            value={kind}
            active={kind !== ''}
            onChange={(next) => setKind(next)}
          />
          <Select
            ariaLabel="Order"
            size="sm"
            width="auto"
            appearance="quiet"
            options={[
              { value: 'updated', label: 'Recent activity' },
              { value: 'title', label: 'Title, A to Z' },
            ]}
            value={order}
            onChange={(next) => setOrder(next)}
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
 * REQUIREDNESS, WITHOUT THE MARK. `required` is the form constraint and it
 * implies the ARIA fact; `aria-required` states the fact on its own.
 *
 * They are separate because the visible mark is not. On a form where an answer
 * is expected almost everywhere, marking every field teaches a reader to skip
 * the mark — so the screen says nothing beside the label and tells assistive
 * technology directly. The left-hand field below is the ordinary one, asterisk
 * and all; the right-hand one carries the same fact to a screen reader with no
 * mark on the page. Given both, the explicit statement is the answer.
 */
export const RequiredWithoutTheMark: Story = {
  render: () => {
    function Fields() {
      const [marked, setMarked] = useState<SelectValue | SelectValue[] | undefined>('');
      const [quiet, setQuiet] = useState<SelectValue | SelectValue[] | undefined>('');
      return (
        <div style={{ display: 'grid', gap: 16, width: 320 }}>
          <FormField label="Owner" required helper="Marked, and stated.">
            {(field) => (
              <Select
                id={field.id}
                aria-describedby={field.describedBy}
                required={field.required}
                placeholder="Choose a seat"
                options={seats}
                value={marked}
                onChange={(next) => setMarked(next)}
              />
            )}
          </FormField>
          <FormField label="Reviewer" helper="Stated only: no asterisk on the page.">
            {(field) => (
              <Select
                id={field.id}
                aria-describedby={field.describedBy}
                aria-required
                placeholder="Choose a seat"
                options={seats}
                value={quiet}
                onChange={(next) => setQuiet(next)}
              />
            )}
          </FormField>
        </div>
      );
    }
    return <Fields />;
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
        // Centred rather than stretched, so the small control keeps its own height.
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 480 }}>
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

const owners: SelectOption[] = [
  { value: 'mira', label: 'Mira Okafor', hint: 'Person', leading: <UserGlyph size="sm" /> },
  { value: 'engineer', label: 'Software Engineer', hint: 'Agent', leading: <BotGlyph size="sm" /> },
  { value: 'sre', label: 'Site Reliability', hint: 'Agent', leading: <BotGlyph size="sm" /> },
  { value: 'engineering', label: 'Engineering', hint: 'Unit', leading: <NetworkGlyph size="sm" /> },
];

/**
 * A LEADING MARK AND A HINT. `leading` draws a mark before an option's label,
 * in the list and on the trigger while that option is chosen; `hint` ends the
 * label's line with the quieter fact that tells two rows apart. `onHighlight`
 * is told where the highlight comes to rest (at once for a key, once the
 * pointer has rested for 120 ms, and nowhere when the list goes), which is
 * what a list that previews its options listens to.
 */
export const LeadingAndHint: Story = {
  render: function Render() {
    const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('mira');
    const [resting, setResting] = useState<string>('nowhere');
    return (
      <div style={{ width: 320, display: 'grid', gap: 12 }}>
        <Select
          ariaLabel="Owner"
          options={owners}
          value={value}
          onChange={(next) => setValue(next)}
          onHighlight={(option) => setResting(option ? String(option.label) : 'nowhere')}
        />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>Highlight resting on: {resting}</p>
      </div>
    );
  },
};

const levels: SelectOption[] = [
  {
    value: 'read',
    label: 'Read',
    description:
      'Reads zones, zone settings, DNS, cache rules, transform rules, firewall and WAF rules, IP lists, SSL and analytics.',
  },
  { value: 'operate', label: 'Operate', description: 'Everything Read does, plus purging the cache and editing cache rules.' },
  {
    value: 'configure',
    label: 'Configure',
    description:
      'Everything Operate does, plus editing transform rules, compression rules and every zone setting, the SSL mode and security level included.',
  },
  {
    value: 'secure',
    label: 'Secure',
    description:
      "Everything Configure does, plus editing the zones' WAF rules and the account's IP lists. It can leave access behind that outlives the agent's token: an allow or skip rule, or an address added to an IP list.",
  },
];

/**
 * A LONG DESCRIPTION FROM A NARROW FIELD: an access level picked in a table
 * cell about 115px wide, each level a name over the sentence saying what it
 * grants. The list is set at a reading width (never narrower than its floor,
 * never wider than its measure or the window) rather than at the field's, so
 * the sentences wrap a phrase to a line, and it opens on whichever side of
 * the field has the room, so the answer stays in view. A plain list of names
 * from the same cell still matches its field.
 */
export const LongDescriptions: Story = {
  render: function Render() {
    const [level, setLevel] = useState<SelectValue | SelectValue[] | undefined>('secure');
    const [plain, setPlain] = useState<SelectValue | SelectValue[] | undefined>('operate');
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '160px 115px 1fr', gap: 12, alignItems: 'center' }}>
        <span>Site Reliability Engineer</span>
        <Select size="sm" ariaLabel="Access" options={levels} value={level} onChange={(next) => setLevel(next)} />
        <span style={{ color: 'var(--color-text-tertiary)' }}>Grants beside the level</span>
        <span>Release Manager</span>
        <Select
          size="sm"
          ariaLabel="Access, names only"
          options={levels.map(({ value, label }) => ({ value, label }))}
          value={plain}
          onChange={(next) => setPlain(next)}
        />
        <span style={{ color: 'var(--color-text-tertiary)' }}>Grants beside the level</span>
      </div>
    );
  },
};

const MODELS: SelectOption[] = [
  { value: 'fleet:opus', label: 'Fleet · Claude Opus', group: 'Fleets', description: '2 of 3 members have room' },
  { value: 'opus-main', label: 'opus-main', group: 'Models', hint: <StatusDot tone="success">Ready</StatusDot> },
  {
    value: 'opus-team-plan-backup',
    label: 'opus-team-plan-backup',
    group: 'Models',
    hint: <StatusDot tone="warning">Sitting out</StatusDot>,
  },
  { value: 'gpt', label: 'gpt', group: 'Models', hint: <StatusDot tone="danger">Sign-in refused</StatusDot> },
];

/**
 * A HINT COLUMN THAT FITS (`hintColumn="fit"`): every option's hint stands in
 * one column at the row's end, as wide as the widest, so each status dot
 * starts at one x whatever the label's length. A quiet picker in a table cell
 * with `inset="flush"` starts its text on the column's x.
 */
export const HintColumnFit: Story = {
  render: function Render() {
    const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('opus-main');
    return (
      <div style={{ width: 280, paddingInlineStart: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>RUNS ON</div>
        <Select
          ariaLabel="Model for Software Engineer"
          size="sm"
          appearance="quiet"
          inset="flush"
          hintColumn="fit"
          options={MODELS}
          value={value}
          onChange={(next) => setValue(next)}
        />
      </div>
    );
  },
};
