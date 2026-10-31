import type { Meta, StoryObj } from '@storybook/react-vite';
import { forwardRef, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { HashGlyph, PanelLeftGlyph, PinGlyph } from '@crewlethq/icons/glyphs';
import { Button, DockColumn, IconButton, Inline, NavGroup, NavItem, SidebarNav, Spacer, Stack, Text, type DockColumnSide } from '@crewlethq/ui';

const meta: Meta<typeof DockColumn> = {
  title: 'UI/DockColumn',
  component: DockColumn,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof DockColumn>;

/** The panel's ground, set on the column the way a host sets it on its own class. */
const SUBTLE = { '--crewlet-dock-column-ground': 'var(--color-surface-subtle)' } as CSSProperties;

/** The rooms, with an Unpin in their own head: a close from inside the dock. */
function Rooms({ onUnpin }: { onUnpin: () => void }) {
  return (
    <Stack gap={1} style={{ padding: 'var(--spacing-2) 0' }}>
      <Inline gap={2} style={{ paddingInline: 'var(--spacing-3) var(--spacing-2)' }}>
        <Text variant="caption">Rooms</Text>
        <Spacer />
        <IconButton label="Unpin rooms" icon={<PinGlyph size="sm" />} size="sm" variant="ghost" onClick={onUnpin} />
      </Inline>
      <RoomList />
    </Stack>
  );
}

function RoomList() {
  return (
    <SidebarNav label="Rooms" dense>
      <NavGroup label="Channels">
        <NavItem href="#/general" label="general" icon={<HashGlyph size="sm" />} current />
        <NavItem href="#/launch" label="launch" icon={<HashGlyph size="sm" />} unread badge={{ value: 2, label: 'mentions' }} />
        <NavItem href="#/support" label="support" icon={<HashGlyph size="sm" />} />
        <NavItem href="#/random" label="random" icon={<HashGlyph size="sm" />} muted />
      </NavGroup>
    </SidebarNav>
  );
}

const Conversation = forwardRef<HTMLButtonElement, { docked: boolean; onToggle: () => void }>(function Conversation(
  { docked, onToggle },
  toggle,
) {
  return (
    <Stack gap={3} style={{ minWidth: 0, padding: 'var(--spacing-4)' }}>
      <div>
        <Button
          ref={toggle}
          variant="secondary"
          size="small"
          leadingIcon={<PanelLeftGlyph size="sm" />}
          aria-pressed={docked}
          onClick={onToggle}
        >
          {docked ? 'Unpin rooms' : 'Pin rooms'}
        </Button>
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <Text key={index}>
          Message {index + 1}: the conversation narrows and widens with the column beside it, frame by frame, and its
          words rewrap as the room they have changes, never in one jump.
        </Text>
      ))}
    </Stack>
  );
});

/** A host's own grid: an `auto` track for the column, and the content beside it. */
function Host({ side, children, column }: { side: DockColumnSide; children: ReactNode; column: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: side === 'start' ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
        height: '100dvh',
        background: 'var(--color-surface-background)',
      }}
    >
      {side === 'start' ? column : null}
      {children}
      {side === 'end' ? column : null}
    </div>
  );
}

function Pinnable({ side, initial }: { side: DockColumnSide; initial: boolean }) {
  const [docked, setDocked] = useState(initial);
  const toggle = useRef<HTMLButtonElement | null>(null);
  return (
    <Host
      side={side}
      column={
        // UNPINNED FROM INSIDE, focus goes to the control that pins it again.
        <DockColumn open={docked} width={280} side={side} style={SUBTLE} focusOnClose={() => toggle.current}>
          <Rooms onUnpin={() => setDocked(false)} />
        </DockColumn>
      }
    >
      <Conversation ref={toggle} docked={docked} onToggle={() => setDocked((open) => !open)} />
    </Host>
  );
}

/**
 * ROOMS PINNED BESIDE A CONVERSATION. Press Unpin and the column eases shut on
 * the slow step with the emphasized curve, the motion the application
 * rail folds by: the panel keeps its width and slides out to the start edge,
 * the conversation widens with it, and the panel stays drawn but inert until
 * the column has closed over it. Pin it again on the way out and it is live
 * where it is. Unpin it from the pin in its own head and focus goes to the
 * Pin rooms control, never left in a panel that takes nothing. Under reduced
 * motion the column simply is or is not.
 */
export const PinnedBesideAConversation: Story = {
  render: () => <Pinnable side="start" initial />,
};

/** Shut, the column takes no width and draws nothing; Pin eases it open. */
export const Unpinned: Story = {
  render: () => <Pinnable side="start" initial={false} />,
};

/**
 * AT THE CONTENT'S END (`side="end"`): the same column after the content, its
 * panel held to the column's start, so it slides in from the end edge, and
 * its hairline on the edge that faces the content.
 */
export const AtTheEnd: Story = {
  render: () => <Pinnable side="end" initial />,
};
