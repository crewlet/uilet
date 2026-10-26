import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { ArtifactMakeRow, ChoiceList, HIT_AREA_CLASS, NavGroup, NavItem, SidebarNav, Tabs } from '@crewlethq/ui';

/**
 * Foundations / Hit areas.
 *
 * The rows of a list are drawn a step apart, and the pointer target of each row
 * reaches half that step on each side, so the targets meet. Move the pointer
 * slowly down any list below: the hand stays a hand and the hover fill moves
 * from one row straight to the next, with no flash of the arrow or of an
 * unfilled gap between them.
 *
 * A row opts in with `HIT_AREA_CLASS` and sets `--crewlet-hit-area-block` (or
 * `-inline`) to half the gap its list is laid out with. The reach is an empty
 * `::after`: it draws nothing and moves nothing, takes the row's cursor, and a
 * press on it is a press on the row. The last panel shows the class on a list
 * of an application's own.
 */
const meta: Meta = {
  title: 'Foundations/Hit areas',
};

export default meta;

const Section = ({ title, note, children }: { title: string; note: string; children: ReactNode }) => (
  <section style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 560 }}>
    <div style={{ display: 'grid', gap: 'var(--spacing-1)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-compact)' }}>{note}</p>
    </div>
    {children}
  </section>
);

function Starters() {
  const [value, setValue] = useState<string | null>('blank');
  return (
    <ChoiceList
      label="Start from"
      value={value}
      onChange={setValue}
      options={[
        { value: 'blank', label: 'Blank', detail: 'One column to start from. Shape the rest in the grid.' },
        { value: 'tracker', label: 'Tracker', detail: 'Work with an owner, a status, a priority and a due date.' },
        { value: 'budget', label: 'Budget', detail: 'Costs by category, with the amount, an owner and whether each is paid.' },
        { value: 'import', label: 'Import a CSV', detail: 'Columns are typed from their values.', separated: true },
      ]}
    />
  );
}

function Lenses() {
  const [value, setValue] = useState('all');
  return (
    <Tabs
      ariaLabel="Artifacts"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'all', label: 'All' },
        { value: 'yours', label: 'Yours' },
        { value: 'shared', label: 'Shared with you' },
      ]}
    />
  );
}

/*
 * An application's own list: the gap and the reach come from one property.
 * The list pads above and below only, where the rows reach past their ends,
 * so its rows stand on the section's edge as every other panel here does.
 */
const ownList = {
  '--crewlet-story-gap': 'var(--spacing-2)',
  display: 'grid',
  gap: 'var(--crewlet-story-gap)',
  margin: 0,
  padding: 'var(--spacing-1) 0',
  listStyle: 'none',
} as CSSProperties;

const ownRow = {
  '--crewlet-hit-area-block': 'calc(var(--crewlet-story-gap) / 2)',
  display: 'block',
  padding: 'var(--spacing-2) var(--spacing-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-default)',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
} as CSSProperties;

export const Lists: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
      <Section title="A list of answers" note="The rows are a step apart, and the answer after the dashed rule reaches up across it.">
        <Starters />
      </Section>
      <Section title="A rail" note="Rows half a step apart, and a nested run a step apart, each reaching half of its own gap.">
        <div style={{ width: 260, background: 'var(--color-surface-subtle)' }}>
          <SidebarNav label="Sections">
            <NavGroup label="Workspace">
              <NavItem href="#worklet" label="Worklet" />
              <NavItem href="#agents" label="Agents" />
              <NavItem href="#live" label="Live" />
              <NavItem href="#doclet" label="Doclet" />
            </NavGroup>
          </SidebarNav>
        </div>
      </Section>
      <Section title="Tabs" note="Across the tabs, and no further than the first and the last: the row scrolls, and a reach past its ends would be width it scrolls by.">
        <Lenses />
      </Section>
      <Section title="A tray" note="Tiles a step apart in both directions, reaching half of it each way.">
        <ArtifactMakeRow
          aria-label="Start a new artifact"
          items={[
            { kind: 'doc', label: 'Docs', detail: 'Write and print', href: '#doc' },
            { kind: 'slides', label: 'Slides', detail: 'A deck to present', href: '#slides' },
            { kind: 'design', label: 'Design', detail: 'Screens on a canvas', href: '#design' },
            { kind: 'dashboard', label: 'Dashboard', detail: 'Live figures', href: '#dashboard' },
            { kind: 'html', label: 'HTML', detail: 'Any web page', href: '#html' },
            { kind: 'sheet', label: 'Sheet', detail: 'A table to fill in', href: '#sheet' },
          ]}
        />
      </Section>
      <Section title="An application's own list" note="HIT_AREA_CLASS on each row, and the row's reach set from the list's gap.">
        <ul style={ownList}>
          {['Pipeline health', 'Launch landing page', 'Quarterly review'].map((name) => (
            <li key={name}>
              <a className={HIT_AREA_CLASS} href={`#${name}`} style={ownRow}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  ),
};
