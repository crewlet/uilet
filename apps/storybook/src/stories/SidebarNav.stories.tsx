import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  AccountTreeGlyph,
  DashboardGlyph,
  DnsGlyph,
  GroupGlyph,
  KeyGlyph,
  ScheduleGlyph,
  TerminalGlyph,
  TokenGlyph,
} from '@crewlethq/icons/glyphs';
import { density } from '@crewlethq/tokens';
import { Count, NavGroup, NavItem, SidebarNav } from '@crewlethq/ui';

const meta: Meta<typeof SidebarNav> = {
  title: 'UI/SidebarNav',
  component: SidebarNav,
  decorators: [
    /*
     * Every story is drawn in a rail-width box on the rail's own ground,
     * because a nav row's background takes the width the gutter leaves it and
     * a row measured against the page is a row measured against the wrong
     * thing. A story that draws SEVERAL rails asks for `bare` and carries its
     * own boxes.
     */
    (Story, context) =>
      context.parameters['bare'] === true ? (
        <Story />
      ) : (
        <div
          style={{
            width: 'var(--size-shell-rail)',
            background: 'var(--color-surface-topbar)',
            borderRight: '1px solid var(--color-border-default)',
          }}
        >
          <Story />
        </div>
      ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarNav>;

export const Sections: Story = {
  render: function SectionsStory() {
    const [at, setAt] = useState('overview');
    const go = (key: string) => (event: React.MouseEvent) => {
      event.preventDefault();
      setAt(key);
    };
    return (
      <SidebarNav label="Sections">
        {/*
          The rail's first run has no name, and a rail built from a list spells
          that as an empty label rather than by leaving the group out. It draws
          no heading box and adds no level for a screen reader to walk: the row
          sits flush under the lockup, exactly as a loose NavItem would.
        */}
        <NavGroup label="">
          <NavItem
            href="#/"
            label="Overview"
            icon={<DashboardGlyph size="sm" />}
            current={at === 'overview'}
            onClick={go('overview')}
            badge={<Count value={3} label="need a person" />}
            badgeTone="attention"
          />
        </NavGroup>
        <NavGroup label="Company">
          <NavItem
            href="#/people"
            label="People"
            icon={<GroupGlyph size="sm" />}
            current={at === 'people'}
            onClick={go('people')}
            badge={<Count value="4 live" />}
          />
          <NavItem
            href="#/org"
            label="Org chart"
            icon={<AccountTreeGlyph size="sm" />}
            current={at === 'org'}
            onClick={go('org')}
            defaultExpanded
          >
            <NavItem href="#/org" label="Chart" current={at === 'chart'} onClick={go('chart')} />
            <NavItem href="#/org" label="Directory" current={at === 'directory'} onClick={go('directory')} />
            <NavItem href="#/org" label="Charter" current={at === 'charter'} onClick={go('charter')} />
          </NavItem>
        </NavGroup>
        <NavGroup label="Work">
          <NavItem
            href="#/runs"
            label="Coding runs"
            icon={<TerminalGlyph size="sm" />}
            current={at === 'runs'}
            onClick={go('runs')}
          />
          <NavItem
            href="#/schedules"
            label="Schedules"
            icon={<ScheduleGlyph size="sm" />}
            current={at === 'schedules'}
            onClick={go('schedules')}
          />
        </NavGroup>
        <NavGroup label="Operations">
          <NavItem
            href="#/fleet"
            label="Fleet"
            icon={<DnsGlyph size="sm" />}
            current={at === 'fleet'}
            onClick={go('fleet')}
          />
          <NavItem
            href="#/spend"
            label="Spend and budgets"
            icon={<TokenGlyph size="sm" />}
            current={at === 'spend'}
            onClick={go('spend')}
          />
          <NavItem
            label="Secrets"
            icon={<KeyGlyph size="sm" />}
            disabledReason="Only an operator can read the names the fleet holds."
          />
        </NavGroup>
      </SidebarNav>
    );
  },
};

export const OneLongRow: Story = {
  render: () => (
    <SidebarNav label="Sections">
      <NavItem
        href="#/conversations"
        label="Agent-to-agent conversations across the whole company"
        icon={<GroupGlyph size="sm" />}
        badge={<Count value={128} label="conversations" />}
      />
    </SidebarNav>
  ),
};

/**
 * Every state a row can be in, at all three densities, side by side.
 *
 * The rail is chrome: it is read at a glance, and what has to be legible at a
 * glance is which row the reader is on. The current row takes the accent
 * TWICE, as its tint and as its ink, so it is found by a reader who sees the
 * hue and by one who does not; the attention count is the one badge in the
 * chrome allowed a status hue, because a count of what is waiting on a person
 * is the one thing that should pull the eye off the screen they are on.
 *
 * Switch the Theme toolbar to see both palettes. Every pair here is measured
 * on the rail's own composites by `SidebarNav.test.tsx` and by the palette
 * suite in @crewlethq/tokens, the attention tint on the accent tint included.
 */
export const EveryRowState: Story = {
  parameters: { bare: true },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', background: 'var(--color-surface-topbar)' }}>
      {(['compact', 'normal', 'comfortable'] as const).map((step) => (
        <div
          key={step}
          /*
           * --density is what the token layer's own density.css sets from
           * data-density on the ROOT, so three densities on one page set the
           * variable directly and read its value from the tokens rather than
           * copying three numbers out of them.
           */
          style={{ flex: '1 1 0', minWidth: 0, ['--density' as string]: density[step] }}
        >
          <div
            style={{
              padding: 'var(--spacing-2) calc(var(--size-nav-gutter) + var(--size-nav-row-pad))',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-2xs)',
              letterSpacing: 'var(--font-letter-spacing-wide)',
              textTransform: 'uppercase',
            }}
          >
            {step}
          </div>
          <SidebarNav label={`Sections at ${step} density`}>
            <NavItem
              href="#/"
              label="Overview"
              icon={<DashboardGlyph size="sm" />}
              current
              badge={<Count value={3} label="need a person" />}
              badgeTone="attention"
            />
            <NavItem href="#/people" label="People" icon={<GroupGlyph size="sm" />} badge={<Count value="4 live" />} />
            <NavItem href="#/runs" label="Coding runs" icon={<TerminalGlyph size="sm" />} />
            <NavGroup label="Operations">
              <NavItem href="#/fleet" label="Fleet" icon={<DnsGlyph size="sm" />} />
              <NavItem
                label="Secrets"
                icon={<KeyGlyph size="sm" />}
                disabledReason="Only an operator can read the names the fleet holds."
              />
            </NavGroup>
          </SidebarNav>
        </div>
      ))}
    </div>
  ),
};
