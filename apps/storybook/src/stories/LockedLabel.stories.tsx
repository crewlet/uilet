import type { Meta, StoryObj } from '@storybook/react-vite';
import { LockedLabel, SidebarNav, Tabs } from '@crewlethq/ui';
import { CogGlyph, KeyGlyph, ServerGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof LockedLabel> = {
  title: 'UI/LockedLabel',
  component: LockedLabel,
};

export default meta;
type Story = StoryObj<typeof LockedLabel>;

/** A place the reader may not open: the words stay, the key says closed, the title says why. */
export const Locked: Story = {
  args: { children: 'Nodes', reason: 'Needs Admin access' },
};

/** Nothing missing, nothing drawn but the words. */
export const Open: Story = {
  args: { children: 'Account' },
};

/**
 * ONE MARK WHEREVER A PLACE IS OFFERED: a nav row's `locked`, and the same
 * label in a row of tabs, so a locked place reads one way in the rail, in a
 * column of sections and in a section's tabs.
 */
export const InTheRailAndInTabs: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)', maxWidth: 520 }}>
      <div style={{ width: 236 }}>
        <SidebarNav label="Settings">
          {/* MIXED: the key on each locked row. */}
          <SidebarNav.Group label="Runtime">
            <SidebarNav.Item label="Secrets" icon={<KeyGlyph size="sm" />} href="#/secrets" locked="Needs Admin access" />
            <SidebarNav.Item label="Appearance" icon={<CogGlyph size="sm" />} href="#/appearance" current />
          </SidebarNav.Group>
          {/* WHOLLY LOCKED: the key once, on the group's label, and the rows quiet. */}
          <SidebarNav.Group label="Engine" locked="Needs Admin access">
            <SidebarNav.Item label="Nodes" icon={<ServerGlyph size="sm" />} href="#/nodes" locked="Needs Admin access" />
            <SidebarNav.Item label="Configuration" icon={<CogGlyph size="sm" />} href="#/config" locked="Needs Admin access" />
          </SidebarNav.Group>
        </SidebarNav>
      </div>
      <Tabs
        ariaLabel="Live sections"
        value="now"
        onValueChange={() => {}}
        items={[
          { value: 'now', label: 'Now running' },
          { value: 'turns', label: <LockedLabel reason="Needs Admin access">Turns</LockedLabel> },
          { value: 'events', label: <LockedLabel reason="Needs Admin access">Event log</LockedLabel> },
        ]}
      />
    </div>
  ),
};
