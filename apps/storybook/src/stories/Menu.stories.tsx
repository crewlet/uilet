import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, Menu, type MenuEntry } from '@crewlethq/ui';
import { DeleteGlyph, EditGlyph, MoveItemGlyph, PersonGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof Menu> = {
  title: 'UI/Menu',
  component: Menu,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Menu>;

const actions: MenuEntry[] = [
  { key: 'edit', label: 'Edit', icon: <EditGlyph />, onSelect: () => {}, hint: <Kbd keys={['Mod', 'e']} /> },
  { key: 'move', label: 'Move to', icon: <MoveItemGlyph />, onSelect: () => {} },
  { key: 'open', label: 'Open seat', icon: <PersonGlyph />, disabled: true, onSelect: () => {} },
  { kind: 'separator', key: 'sep' },
  { key: 'delete', label: 'Delete', icon: <DeleteGlyph />, danger: true, onSelect: () => {} },
];

/** An icon trigger, named by its label, which is also its tooltip. */
export const RowActions: Story = {
  args: { label: 'Actions for Software Engineer', items: actions },
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
      { key: 'view', label: 'View logs', icon: <EditGlyph />, onSelect: () => {}, hint: <Kbd keys={['Mod', 'l']} /> },
      { key: 'move', label: 'Move to', icon: <MoveItemGlyph />, onSelect: () => {} },
      {
        key: 'roll',
        label: 'Roll back',
        description: 'Returns every node to the revision before this one',
        onSelect: () => {},
      },
      { kind: 'separator', key: 'sep' },
      { key: 'delete', label: 'Delete', icon: <DeleteGlyph />, danger: true, onSelect: () => {} },
    ],
  },
};
