import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';
import {
  ActivityGlyph,
  CircleCheckGlyph,
  ClockGlyph,
  CoinsGlyph,
  HashGlyph,
  InboxGlyph,
  KeyGlyph,
  LayoutDashboardGlyph,
  LockGlyph,
  MessageSquareGlyph,
  NetworkGlyph,
  PlusGlyph,
  ServerGlyph,
  SquareTerminalGlyph,
  UsersGlyph,
} from '@crewlethq/icons/glyphs';
import { density } from '@crewlethq/tokens';
import { Avatar, NavGroup, NavItem, SidebarNav, StatusDot } from '@crewlethq/ui';

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
        <div style={{ width: 'var(--size-shell-rail)', background: 'var(--color-surface-frame)' }}>
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
            icon={<LayoutDashboardGlyph size="sm" />}
            current={at === 'overview'}
            onClick={go('overview')}
          />
          <NavItem
            href="#/inbox"
            label="Inbox"
            icon={<InboxGlyph size="sm" />}
            current={at === 'inbox'}
            onClick={go('inbox')}
            badge={{ value: 3, label: 'need a person' }}
          />
        </NavGroup>
        <NavGroup label="Company">
          <NavItem
            href="#/people"
            label="People"
            icon={<UsersGlyph size="sm" />}
            current={at === 'people'}
            onClick={go('people')}
            count={{ value: 4, label: 'working', mark: <StatusDot tone="info" pulse /> }}
          />
          <NavItem
            href="#/org"
            label="Org chart"
            icon={<NetworkGlyph size="sm" />}
            current={at === 'org'}
            onClick={go('org')}
            defaultExpanded
          >
            <NavItem href="#/org" label="Chart" current={at === 'chart'} onClick={go('chart')} />
            <NavItem href="#/org" label="Directory" current={at === 'directory'} onClick={go('directory')} />
            <NavItem href="#/org" label="Charter" current={at === 'charter'} onClick={go('charter')} />
          </NavItem>
        </NavGroup>
        <NavGroup
          label="Projects"
          action={{ label: 'New project', icon: <PlusGlyph size="sm" />, onClick: () => {} }}
        >
          <NavItem
            href="#/worklet/eng"
            label="Core platform"
            lead="ENG"
            current={at === 'eng'}
            onClick={go('eng')}
            count={{ value: 23, label: 'open' }}
          />
          <NavItem
            href="#/worklet/prod"
            label="Product"
            lead="PROD"
            current={at === 'prod'}
            onClick={go('prod')}
            count={{ value: 11, label: 'open' }}
          />
        </NavGroup>
        <NavGroup label="Work">
          <NavItem
            href="#/runs"
            label="Coding runs"
            icon={<SquareTerminalGlyph size="sm" />}
            current={at === 'runs'}
            onClick={go('runs')}
          />
          <NavItem
            href="#/schedules"
            label="Schedules"
            icon={<ClockGlyph size="sm" />}
            current={at === 'schedules'}
            onClick={go('schedules')}
          />
        </NavGroup>
        <NavGroup label="Operations">
          <NavItem
            href="#/fleet"
            label="Fleet"
            icon={<ServerGlyph size="sm" />}
            current={at === 'fleet'}
            onClick={go('fleet')}
          />
          <NavItem
            href="#/spend"
            label="Spend and budgets"
            icon={<CoinsGlyph size="sm" />}
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

/**
 * WHAT WAITS ON THE READER IS ONE PILL, WHEREVER IT STANDS. The inbox, the
 * reader's own work and the conversations that name them each carry a
 * `badge`: a round pill for one or two figures, centred on its row's line and
 * ending on the row's end inset, so the pills stand in one column down the
 * rail. The inbox and the conversations call in the accent; the reader's own
 * work waits in the quiet grey (`tone: 'quiet'`), its ink lifting with the
 * row the reader is on. A `count` (the turns Live is running) is the quiet
 * figure on the same end line, for what a place holds rather than what waits.
 */
export const BadgesOnTheRowsAboutYou: Story = {
  render: () => (
    <SidebarNav label="Navigation">
      <NavGroup label="">
        <NavItem href="#/inbox" label="Inbox" icon={<InboxGlyph size="sm" />} badge={{ value: '50+', label: 'unread' }} />
        <NavItem
          href="#/me"
          label="My work"
          icon={<CircleCheckGlyph size="sm" />}
          current
          badge={{ value: 23, label: 'open, assigned to you', tone: 'quiet' }}
        />
        <NavItem
          href="#/chatlet"
          label="Chatlet"
          icon={<MessageSquareGlyph size="sm" />}
          badge={{ value: 4, label: 'unread mentions and direct messages' }}
        />
        <NavItem
          href="#/live"
          label="Live"
          icon={<ActivityGlyph size="sm" />}
          count={{ value: 2, label: 'working', mark: <StatusDot tone="info" pulse /> }}
        />
      </NavGroup>
    </SidebarNav>
  ),
};

/**
 * THE TWO TONES OF A BADGE, side by side. `attention` (the default) is the
 * accent's filled pill, what the reader is asked to act on: the unread in the
 * inbox. `quiet` keeps the same round pill, the same size and the same end
 * line, in the quiet count's grey: the reader's own open work, which waits but
 * does not call. Both are read with their words ("My work, 23 open, assigned
 * to you"). The pair is measured on every ground a row can have, the
 * reader's own row included, in every palette.
 */
export const BadgeTones: Story = {
  render: () => (
    <SidebarNav label="Navigation">
      <NavGroup label="">
        <NavItem href="#/inbox" label="Inbox" icon={<InboxGlyph size="sm" />} badge={{ value: '50+', label: 'unread' }} />
        <NavItem
          href="#/me"
          label="My work"
          icon={<CircleCheckGlyph size="sm" />}
          badge={{ value: 23, label: 'open, assigned to you', tone: 'quiet' }}
        />
        <NavItem
          href="#/me-current"
          label="My work, current"
          icon={<CircleCheckGlyph size="sm" />}
          current
          badge={{ value: 23, label: 'open, assigned to you', tone: 'quiet' }}
        />
      </NavGroup>
    </SidebarNav>
  ),
};

export const OneLongRow: Story = {
  render: () => (
    <SidebarNav label="Sections">
      <NavItem
        href="#/conversations"
        label="Agent-to-agent conversations across the whole company"
        icon={<UsersGlyph size="sm" />}
        count={{ value: 128, label: 'conversations' }}
      />
    </SidebarNav>
  ),
};

/**
 * ONE DENSITY, SCOPED TO ONE RAIL, for a story that draws all three side by
 * side.
 *
 * The token layer declares every spacing and size step on the root as
 * `calc(Npx * var(--density, 1))`, and a custom property is computed where it
 * is declared: a --density set on a rail's box reaches nothing under it, and
 * this story drew the normal rail three times under three headings. The box
 * re-declares each step the root writes in terms of --density, read from the
 * loaded stylesheets rather than copied out of them, so each one resolves
 * against the box's own setting. The same helper lives in Card.stories.tsx;
 * a shared home beside themeScope.ts is the next step.
 */
function densityScope(step: keyof typeof density): CSSProperties {
  const scope: Record<string, string> = { '--density': density[step] };
  const read = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
        for (const name of Array.from(rule.style)) {
          const value = rule.style.getPropertyValue(name).trim();
          if (name.startsWith('--') && value.includes('var(--density')) scope[name] = value;
        }
      } else if (rule instanceof CSSGroupingRule) {
        read(rule.cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    // A stylesheet from another origin keeps its rules to itself.
    try {
      read(sheet.cssRules);
    } catch {
      continue;
    }
  }
  return scope as CSSProperties;
}

/**
 * Every state a row can be in, at all three densities, side by side.
 *
 * The rail is chrome: it is read at a glance, and what has to be legible at a
 * glance is which row the reader is on. The current row stands on the raised
 * rung with a hairline round it, and no hue: it is found by its lift and its
 * line, by a reader who sees colour and by one who does not. The badge is the
 * one figure in the chrome allowed a hue, and it is the accent's fill, because
 * a count of what is waiting on the reader is the one thing in the rail that
 * asks them to act; a count is the quiet figure, and it lifts to the row's ink
 * on the reader's own row. A project's key is a chip on the raised rung.
 *
 * Switch the Theme toolbar to see both palettes. Every pair here is measured
 * on the rail's own grounds by `SidebarNav.test.tsx` and by the palette suite
 * in @crewlethq/tokens, the current row's lift and hairline included.
 */
export const EveryRowState: Story = {
  parameters: { bare: true },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', background: 'var(--color-surface-frame)' }}>
      {(['compact', 'normal', 'comfortable'] as const).map((step) => (
        <div
          key={step}
          /*
           * The token layer sets --density from data-density on the ROOT, so
           * three densities on one page scope the density-scaled steps to each
           * rail's box (see densityScope) rather than copy their numbers.
           */
          style={{ flex: '1 1 0', minWidth: 0, ...densityScope(step) }}
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
              icon={<LayoutDashboardGlyph size="sm" />}
              current
              count={{ value: 12, label: 'open' }}
            />
            <NavItem href="#/inbox" label="Inbox" icon={<InboxGlyph size="sm" />} badge={{ value: 3, label: 'need a person' }} />
            <NavItem href="#/people" label="People" icon={<UsersGlyph size="sm" />} count={{ value: 4, label: 'live' }} />
            <NavItem href="#/worklet/eng" label="Core platform" lead="ENG" count={{ value: 23, label: 'open' }} />
            <NavItem href="#/runs" label="Coding runs" icon={<SquareTerminalGlyph size="sm" />} />
            <NavGroup
              label="Operations"
              action={{ label: 'Add a node', icon: <PlusGlyph size="sm" />, onClick: () => {} }}
            >
              <NavItem href="#/fleet" label="Fleet" icon={<ServerGlyph size="sm" />} />
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

/**
 * A LONG LIST READ IN PASSING (`dense`), as the Rooms panel beside a
 * conversation draws it: rows at the 24px target floor, the gutter halved so
 * the open room's highlight is a long bar, every glyph and name still on the
 * line a navigation row puts it on, faces and glyphs in one 20px column, and
 * names in the regular weight.
 *
 * A room with news is `unread` (its name a step heavier, in the primary ink);
 * a muted one rests in the quiet ink and says so. Each section folds from its
 * heading, and a folded section still shows the open room and the rooms with
 * news: fold Channels to see it.
 */
export const DenseList: Story = {
  render: function DenseListStory() {
    const [at, setAt] = useState('engineering');
    const room = (key: string, extra: Partial<Parameters<typeof NavItem>[0]> = {}) => (
      <NavItem
        key={key}
        label={key}
        icon={<HashGlyph size="sm" />}
        current={at === key}
        onClick={() => setAt(key)}
        {...extra}
      />
    );
    const person = (name: string, extra: Partial<Parameters<typeof NavItem>[0]> = {}) => (
      <NavItem
        key={name}
        label={name}
        icon={<Avatar name={name} kind="agent" size="xs" decorative />}
        current={at === name}
        onClick={() => setAt(name)}
        {...extra}
      />
    );
    return (
      <SidebarNav label="Rooms" dense>
        <NavGroup label="Starred" collapsible>
          {room('engineering')}
          {room('launch', { unread: true, badge: { value: 2, label: 'mentions' } })}
        </NavGroup>
        <NavGroup
          label="Channels"
          collapsible
          action={{ label: 'New room', icon: <PlusGlyph size="sm" />, onClick: () => {} }}
        >
          {room('general')}
          {room('design', { unread: true })}
          {room('random', { unread: true, muted: true })}
          {room('leadership', { icon: <LockGlyph size="sm" /> })}
          {room('a room whose name is longer than the panel is wide')}
        </NavGroup>
        <NavGroup label="Direct messages" collapsible>
          {person('Senior Backend Engineer', { unread: true, badge: { value: 1, label: 'unread for you' } })}
          {person('Designer')}
          {person('Release Manager', { muted: true })}
        </NavGroup>
      </SidebarNav>
    );
  },
};
