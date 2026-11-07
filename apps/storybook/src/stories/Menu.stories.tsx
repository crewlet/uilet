import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Kbd, Menu, type MenuEntry } from '@crewlethq/ui';
import { FolderInputGlyph, PencilGlyph, RotateCcwGlyph, TrashGlyph, UserGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';

const meta: Meta<typeof Menu> = {
  title: 'UI/Menu',
  component: Menu,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Menu>;

const actions: MenuEntry[] = [
  { key: 'edit', label: 'Edit', icon: <PencilGlyph />, onSelect: () => {}, hint: <Kbd keys={['Mod', 'e']} /> },
  { key: 'move', label: 'Move to', icon: <FolderInputGlyph />, onSelect: () => {} },
  { key: 'open', label: 'Open seat', icon: <UserGlyph />, disabled: true, onSelect: () => {} },
  { kind: 'separator', key: 'sep' },
  { key: 'delete', label: 'Delete', icon: <TrashGlyph />, danger: true, onSelect: () => {} },
];

/** An icon trigger, named by its label, which is also its tooltip. */
export const RowActions: Story = {
  args: { label: 'Actions for Software Engineer', items: actions },
};

/** Drawn the frame it is placed (`entrance="instant"`), for a menu a reader opens over and over, such as a message's. */
export const InstantEntrance: Story = {
  args: { label: 'Actions for this message', items: actions, entrance: 'instant' },
};

/** A trigger with visible text, for a toolbar where there is room for a word. */
export const WithLabel: Story = {
  args: { label: 'Actions for Software Engineer', items: actions, trigger: 'Actions', triggerVariant: 'secondary' },
};

/**
 * A choice, not a list of actions.
 *
 * Consecutive items given `checked` become radio items in one group, so a
 * screen reader counts "2 of 3" among the answers rather than among every
 * item, and the check column lines the labels up.
 */
export const AChoice: Story = {
  args: {
    label: 'Lead of Engineering',
    trigger: 'Lead',
    triggerVariant: 'secondary',
    items: [
      { key: 'none', label: 'No lead', checked: false, onSelect: () => {} },
      { key: 'vpe', label: 'VP Engineering', checked: true, onSelect: () => {} },
      { key: 'staff', label: 'Staff Engineer', checked: false, onSelect: () => {} },
      { kind: 'separator', key: 'sep' },
      { key: 'other', label: 'Choose another seat', onSelect: () => {} },
    ],
  },
};

/** An item whose name is not enough carries a second line. */
export const WithDescriptions: Story = {
  args: {
    label: 'Actions for the API key',
    trigger: 'Manage',
    triggerVariant: 'secondary',
    items: [
      {
        key: 'rotate',
        label: 'Rotate key',
        description: 'Issues a new key and keeps the old one for an hour',
        onSelect: () => {},
      },
      {
        key: 'revoke',
        label: 'Revoke key',
        description: 'Stops every request using it, at once',
        danger: true,
        onSelect: () => {},
      },
    ],
  },
};

/**
 * The register, in one menu: rows of verbs at one line each, and the one row
 * that carries a second line drawn taller on its own.
 *
 * Every row pays for the taller shape and six verbs become a scroller, which
 * is why the height is on the described row rather than on the panel.
 */
export const MixedRows: Story = {
  args: {
    label: 'Actions for the deployment',
    trigger: 'Actions',
    triggerVariant: 'secondary',
    items: [
      { key: 'view', label: 'View logs', icon: <PencilGlyph />, onSelect: () => {}, hint: <Kbd keys={['Mod', 'l']} /> },
      { key: 'move', label: 'Move to', icon: <FolderInputGlyph />, onSelect: () => {} },
      {
        key: 'roll',
        label: 'Roll back',
        // Short enough to stay one line under the panel's 320px ceiling at
        // every density, now that the row carries a glyph column.
        description: 'Returns every node to the previous revision',
        // A glyph like its neighbours', so its label starts where theirs do.
        icon: <RotateCcwGlyph />,
        onSelect: () => {},
      },
      { kind: 'separator', key: 'sep' },
      { key: 'delete', label: 'Delete', icon: <TrashGlyph />, danger: true, onSelect: () => {} },
    ],
  },
};

/** Facts above the actions, read rather than pressed: what the actions are about. */
export const WithHeader: Story = {
  args: {
    label: 'Your account',
    header: 'Access: Admin',
    items: [
      { key: 'account', label: 'Account settings', icon: <UserGlyph />, onSelect: () => {} },
      { kind: 'separator', key: 'sep' },
      { key: 'out', label: 'Sign out', onSelect: () => {} },
    ],
  },
};

/**
 * No narrower than its trigger: a trigger that spans a column, such as the
 * reader's row at the foot of the rail, opens a panel that covers it edge to
 * edge and grows past it when a row needs the room.
 */
export const TriggerWidth: Story = {
  args: {
    label: 'Your account',
    width: 'trigger',
    renderTrigger: (props) => (
      <Button {...props} variant="secondary" size="small" block>
        Lee Park
      </Button>
    ),
    items: [
      {
        key: 'account',
        label: 'Account',
        description: 'Password, two-step verification and sessions',
        icon: <UserGlyph />,
        onSelect: () => {},
      },
      { kind: 'separator', key: 'sep' },
      { key: 'out', label: 'Sign out', onSelect: () => {} },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'grid', width: 248 }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * The kit Tooltip on the menu's own trigger (`tooltip`): rest the pointer on
 * the trigger, or Tab onto it, and the tip names it; it steps aside while the
 * menu is open. A screen reader hears the trigger's full name ("More actions
 * for Software Engineer") and not the tip again.
 */
export const WithATooltip: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
        <Menu label="More actions for Software Engineer" tooltip="More actions" align="end" items={actions} />
        <Menu label="Add to the organization" trigger="Add" triggerVariant="outline" tooltip="Add a seat or a team" items={actions} />
      </div>
    </BothThemes>
  ),
};
