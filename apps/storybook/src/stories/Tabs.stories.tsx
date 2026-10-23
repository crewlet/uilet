import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, TabPanel, Tabs } from '@crewlethq/ui';
import {
  ChartNoAxesGanttGlyph,
  InboxGlyph,
  SquareTerminalGlyph,
} from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const SECTIONS = [
  { value: 'turns', label: 'Turns', icon: <ChartNoAxesGanttGlyph />, count: 12 },
  { value: 'tools', label: 'Tools', icon: <SquareTerminalGlyph />, count: 4 },
  { value: 'inbox', label: 'Inbox', icon: <InboxGlyph />, count: 0 },
];

/**
 * MORE SECTIONS THAN THE WINDOW HAS ROOM FOR. The row scrolls sideways rather
 * than pushing the screen it is on, its scrollbar is hidden because it would
 * sit on the baseline the accent bar is drawn on, and the arrow keys reach
 * every tab either way. The focus ring is drawn INSIDE the tab, because an
 * outset one is clipped by the scroller the row has become.
 */
export const ManySections: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('turns');
      const many = [
        ...SECTIONS,
        { value: 'knowledge', label: 'Knowledge' },
        { value: 'memory', label: 'Memory' },
        { value: 'schedule', label: 'Schedule' },
        { value: 'budgets', label: 'Budgets' },
        { value: 'secrets', label: 'Secrets' },
        { value: 'integrations', label: 'Integrations' },
      ];
      return (
        <div style={{ width: 380 }}>
          <Tabs
            ariaLabel="Seat sections"
            variant="underline"
            panelId="many-sections"
            items={many}
            value={value}
            onValueChange={setValue}
          />
          <TabPanel id="many-sections" value={value}>
            <p style={{ paddingTop: 16 }}>The {value} section.</p>
          </TabPanel>
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * A row of sections, with the panel it controls. One tab stop: the arrows,
 * Home and End move along the row, and Enter or Space selects, because a
 * section pushes a history entry.
 */
export const Sections: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('turns');
      return (
        <div style={{ width: 560 }}>
          <Tabs
            ariaLabel="Seat sections"
            variant="underline"
            panelId="seat-sections"
            items={SECTIONS}
            value={value}
            onValueChange={setValue}
          />
          <TabPanel id="seat-sections" value={value}>
            <p style={{ paddingTop: 16 }}>The {value} section.</p>
          </TabPanel>
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * THE CHIP REGISTER, BESIDE THE CONTROL IT SITS NEXT TO. A chip stands shorter
 * than a control by design: the well adds its 1px boundary and its 2px inset
 * above and below every one of them, so a row of chips at a full control step
 * is taller than the button next to it. Both chips are 24px, the target floor
 * exactly, which puts the md well at the 30px of the button beside it, and both
 * are clamped against --size-target-min so the compact density setting cannot
 * take them under it.
 *
 * THE FLOOR IS TAKEN IN BOTH DIRECTIONS. A chip is side padding around
 * whatever it holds, so a one-character label or a bare glyph drew a target as
 * narrow as its own content: the third row here is the shape the engine's rail
 * draws, and its chips stood between 19px and 26px wide until the same floor
 * was taken on the width. A chip wider than its content by the floor centres
 * what it draws; the stretched row that wants a common inner edge is the
 * segmented CARD row, which aligns its own options to the start.
 */
export const PillRegisters: Story = {
  render: () => {
    function Demo() {
      const [big, setBig] = useState('sections');
      const [small, setSmall] = useState('sections');
      const [mark, setMark] = useState('normal');
      const items = [
        { value: 'sections', label: 'Sections' },
        { value: 'revisions', label: 'Revisions' },
      ];
      // One character each, which is what the floor is for.
      const marks = [
        { value: 'compact', label: 'S' },
        { value: 'normal', label: 'M' },
        { value: 'comfortable', label: 'L' },
      ];
      return (
        <div style={{ display: 'grid', gap: 'var(--spacing-4)', justifyItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <Tabs
              ariaLabel="Configuration views, medium"
              variant="pill"
              items={items}
              value={big}
              onValueChange={setBig}
            />
            <Button variant="secondary">A control</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <Tabs
              ariaLabel="Configuration views, small"
              variant="pill"
              size="sm"
              items={items}
              value={small}
              onValueChange={setSmall}
            />
            <Button variant="secondary" size="small">
              A small control
            </Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <Tabs
              ariaLabel="Marks, small"
              variant="pill"
              size="sm"
              items={marks}
              value={mark}
              onValueChange={setMark}
            />
            <Button variant="secondary" size="small">
              A small control
            </Button>
          </div>
        </div>
      );
    }
    return <Demo />;
  },
};

export const Pill: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('sections');
      return (
        <Tabs
          ariaLabel="Configuration views"
          variant="pill"
          size="sm"
          items={[
            { value: 'sections', label: 'Sections' },
            { value: 'revisions', label: 'Revisions', count: 7 },
            { value: 'archive', label: 'Archive', disabled: true },
          ]}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    return <Demo />;
  },
};

/**
 * Router mode: the root is a `nav` of links and nothing carries a tab role,
 * because a link that navigates is not a tab.
 */
export const RouterLinks: Story = {
  render: () => (
    <div style={{ width: 560 }}>
      <Tabs
        ariaLabel="Wallet sections"
        variant="underline"
        value="/wallet/overview"
        items={[
          { value: '/wallet/overview', label: 'Overview' },
          { value: '/wallet/billing-profile', label: 'Billing profile' },
          { value: '/wallet/referrals', label: 'Referrals' },
        ]}
        renderItem={({ item, className, isActive, children }) => (
          <a
            href={item.value}
            className={`${className}${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => event.preventDefault()}
          >
            {children}
          </a>
        )}
      />
    </div>
  ),
};

/**
 * A WORKSPACE'S SECTIONS, as the console's header draws them: router links
 * with a glyph and a formatted figure each, and `overflow="menu"`. The row
 * draws the sections that FIT and folds the rest into "More", inside the
 * navigation landmark; the reading note at its end gives way before a single
 * section folds. Narrow the canvas to watch them go, last first, with the
 * section the reader is on always drawn.
 */
export const SectionsWithMore: Story = {
  render: () => {
    const sections = [
      { value: '/me', label: 'Queue', icon: <InboxGlyph />, count: '12' },
      { value: '/me/asked', label: 'Asked of me', icon: <SquareTerminalGlyph />, count: '3' },
      { value: '/me/watching', label: 'Watching', icon: <ChartNoAxesGanttGlyph />, count: '1.2k' },
      { value: '/me/checklist', label: 'Checklist', icon: <InboxGlyph />, count: '0' },
      { value: '/me/unblocked', label: 'Unblocked', icon: <SquareTerminalGlyph />, count: '4' },
    ];
    return (
      <div style={{ maxWidth: 720, resize: 'horizontal', overflow: 'hidden', paddingBottom: 'var(--spacing-2)' }}>
        <Tabs
          overflow="menu"
          ariaLabel="My work sections"
          moreMenuLabel="More sections of My work"
          variant="underline"
          value="/me"
          items={sections}
          note="Counts are over everything open"
          renderItem={({ item, className, isActive, children, foldProps }) => (
            <a
              href={item.value}
              className={className}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => event.preventDefault()}
              {...foldProps}
            >
              {children}
            </a>
          )}
        />
      </div>
    );
  },
};

function SeatTabs() {
  const [value, setValue] = useState('overview');
  return (
    <div style={{ maxWidth: 360, resize: 'horizontal', overflow: 'hidden', paddingBottom: 'var(--spacing-2)' }}>
      <Tabs
        overflow="menu"
        variant="underline"
        ariaLabel="SWE sections"
        value={value}
        onValueChange={setValue}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'work', label: 'Work', count: 12 },
          { value: 'turns', label: 'Turns', live: 'running now' },
          { value: 'memory', label: 'Memory' },
          { value: 'schedules', label: 'Schedules' },
          { value: 'settings', label: 'Settings' },
        ]}
      />
    </div>
  );
}

/**
 * AN OBJECT'S OWN TABS on a phone's width: a tab list that folds, "More"
 * beside it. A tab with something running behind it pulses and says so in
 * words, on the row and as its menu entry's second line. A tab picked from
 * the menu is chosen and drawn in the last place that fits.
 */
export const FoldIntoMore: Story = { render: () => <SeatTabs /> };

function MarkedTabs() {
  const [value, setValue] = useState('profile');
  return (
    <Tabs
      variant="underline"
      ariaLabel="Seat sections"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'profile', label: 'Profile', marker: { tone: 'danger', count: 1, label: '1 problem' } },
        { value: 'work', label: 'Work', marker: { tone: 'changed', label: 'Changed' } },
        { value: 'model', label: 'Model', marker: { tone: 'warning', label: 'A warning' } },
        { value: 'tools', label: 'Integrations' },
        { value: 'advanced', label: 'Advanced', count: 6 },
      ]}
    />
  );
}

/**
 * MARKERS: what needs the reader behind a tab. Problems are a danger count, a
 * warning or an unsaved change a 6px dot; one per tab, the most urgent, and a
 * marker stands in for the tab's count while it is set.
 */
export const Markers: Story = { render: () => <MarkedTabs /> };

function LensChips() {
  const [value, setValue] = useState('tasks');
  return (
    <Tabs
      variant="chip"
      ariaLabel="Lens"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'tasks', label: 'Tasks', count: 2 },
        { value: 'about', label: 'About' },
        { value: 'history', label: 'History' },
        { value: 'files', label: 'Files' },
      ]}
    />
  );
}

/**
 * CHIPS: the lenses beside an object's name in a page's bar. No well round
 * them; the lens that is on is outlined in the accent and nothing else.
 */
export const Chip: Story = { render: () => <LensChips /> };
