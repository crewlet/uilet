import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  ActivityGlyph,
  BookOpenGlyph,
  BuildingComplexGlyph,
  CalendarClockGlyph,
  CircleCheckGlyph,
  HouseGlyph,
  InboxGlyph,
  LayersGlyph,
  LayoutGridGlyph,
  MessageSquareGlyph,
  NetworkGlyph,
  PlugGlyph,
  SearchGlyph,
  SquareKanbanGlyph,
  SwatchBookGlyph,
  TargetGlyph,
} from '@crewlethq/icons/glyphs';
import { CompactNav, CompactNavGroup, CompactNavItem, CompactNavSeparator, type CompactNavLink } from '@crewlethq/ui';

const meta: Meta<typeof CompactNav> = {
  title: 'UI/CompactNav',
  component: CompactNav,
  decorators: [
    /*
     * Every story is drawn in the compact rail's own column on the rail's own
     * ground, because a tile's figure is cut out of that ground by its ring
     * and a flyout opens a gap off the column's edge.
     */
    (Story) => (
      <div style={{ width: 'var(--size-shell-rail-compact)', background: 'var(--color-surface-frame)', paddingBlock: 'var(--spacing-2)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CompactNav>;

/**
 * The rail folded to its marks, as the approved design draws it: Search, the
 * three places every reader starts from (the inbox's badge in the accent, and
 * the reader's own work in the quiet grey), a rule, then Company and
 * Workspace folded into one tile each. Point at or press a group's tile to
 * open its flyout; from the keyboard, Right opens it on its first place, Up
 * and Down walk it, Escape or Left close it and Tab moves on from the tile.
 *
 * The Workspace tile carries Chatlet's badge, and is current while Chatlet is
 * the page, so folding never hides what is waiting or where the reader is.
 */
export const Folded: Story = {
  render: function FoldedStory() {
    const [at, setAt] = useState('chatlet');
    const go = (key: string) => (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setAt(key);
    };
    const link = (key: string, label: string, icon: ReactNode, extra: Partial<CompactNavLink> = {}): CompactNavLink => ({
      key,
      label,
      icon,
      href: `#/${key}`,
      current: at === key,
      onClick: go(key),
      ...extra,
    });
    return (
      <CompactNav label="Navigation">
        <CompactNavItem label="Search" icon={<SearchGlyph size="sm" />} title="Ask or jump to" keyshortcuts="Meta+K Control+K" onClick={() => {}} />
        <CompactNavItem label="Home" icon={<HouseGlyph size="sm" />} href="#/home" current={at === 'home'} onClick={go('home')} />
        <CompactNavItem
          label="Inbox"
          icon={<InboxGlyph size="sm" />}
          href="#/inbox"
          current={at === 'inbox'}
          onClick={go('inbox')}
          badge={{ value: '50+', label: 'unread' }}
        />
        <CompactNavItem
          label="My work"
          icon={<CircleCheckGlyph size="sm" />}
          href="#/me"
          current={at === 'me'}
          onClick={go('me')}
          badge={{ value: 23, label: 'open, assigned to you', tone: 'quiet' }}
        />
        <CompactNavSeparator label="Company and Workspace" />
        <CompactNavGroup
          label="Company"
          icon={<BuildingComplexGlyph size="sm" />}
          links={[
            link('principles', 'Principles', <BuildingComplexGlyph size="sm" />),
            link('brand', 'Brand', <SwatchBookGlyph size="sm" />),
            link('org', 'Org chart', <NetworkGlyph size="sm" />),
            link('schedules', 'Schedules', <CalendarClockGlyph size="sm" />),
            link('integrations', 'Integrations', <PlugGlyph size="sm" />, { locked: 'Needs Admin access' }),
            link('budgets', 'Budgets', <TargetGlyph size="sm" />),
          ]}
        />
        <CompactNavGroup
          label="Workspace"
          icon={<LayoutGridGlyph size="sm" />}
          links={[
            link('worklet', 'Worklet', <SquareKanbanGlyph size="sm" />, { count: { value: 23, label: 'open' } }),
            link('chatlet', 'Chatlet', <MessageSquareGlyph size="sm" />, {
              badge: { value: 4, label: 'unread mentions and direct messages' },
            }),
            link('doclet', 'Doclet', <BookOpenGlyph size="sm" />),
            link('artifacts', 'Artifacts', <LayersGlyph size="sm" />),
            link('live', 'Live', <ActivityGlyph size="sm" />),
          ]}
        />
      </CompactNav>
    );
  },
};

/**
 * One tile in each of its states: at rest, current, with a badge waiting on
 * the reader, with a quiet count, and closed to the reader (its name keeps
 * the key, its title says why).
 */
export const Tiles: Story = {
  render: () => (
    <CompactNav label="Tiles">
      <CompactNavItem label="Home" icon={<HouseGlyph size="sm" />} href="#/home" />
      <CompactNavItem label="Chatlet" icon={<MessageSquareGlyph size="sm" />} href="#/chatlet" current />
      <CompactNavItem label="Inbox" icon={<InboxGlyph size="sm" />} href="#/inbox" badge={{ value: 5, label: 'unread' }} />
      <CompactNavItem label="Worklet" icon={<SquareKanbanGlyph size="sm" />} href="#/worklet" count={{ value: 23, label: 'open' }} />
      <CompactNavItem label="Budgets" icon={<TargetGlyph size="sm" />} href="#/budgets" locked="Needs Admin access" />
      <CompactNavItem label="Integrations" icon={<PlugGlyph size="sm" />} href="#/integrations" />
    </CompactNav>
  ),
};
