import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, TabPanel, Tabs } from '@crewlethq/ui';
import { InboxGlyph, TerminalGlyph, TimelineGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const SECTIONS = [
  { value: 'turns', label: 'Turns', icon: <TimelineGlyph />, count: 12 },
  { value: 'tools', label: 'Tools', icon: <TerminalGlyph />, count: 4 },
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
 * than a control by design: the well adds its own 2px above and below every
 * one of them, so a row of chips at a full control step is taller than the
 * button next to it. The md chip is 26px and the sm chip 24px, which is the
 * 24px target floor exactly, and both are clamped against --size-target-min so
 * the compact density setting cannot take them under it.
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
