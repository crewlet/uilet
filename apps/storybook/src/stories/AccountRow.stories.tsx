import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyGlyph, LogOutGlyph, PaletteGlyph, Settings2Glyph, UserGlyph } from '@crewlethq/icons/glyphs';
import { AccountRow, Avatar, IconButton, Tag } from '@crewlethq/ui';

const meta: Meta<typeof AccountRow> = {
  title: 'UI/AppShell/AccountRow',
  component: AccountRow,
  decorators: [
    (Story) => (
      <div style={{ width: 240, padding: 'var(--spacing-2)', background: 'var(--color-surface-frame)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    avatar: <Avatar name="Lee Park" kind="human" size="sm" ring="brand" decorative />,
    name: 'Lee Park',
    detail: 'lee · Operations',
    href: '#/account',
    title: 'Your account: password, second factor and sessions',
  },
};

export default meta;
type Story = StoryObj<typeof AccountRow>;

const preferences = (
  <IconButton label="Account and preferences" icon={<Settings2Glyph size="sm" />} size="sm" variant="ghost" />
);

/**
 * The signed-in reader at the foot of the rail, as the way to their own
 * account. It ends in a chevron at rest, and its controls sit beside the link
 * rather than inside it.
 */
export const Basic: Story = { args: { actions: preferences } };

/**
 * The build the app runs, as the foot's last line: quiet, under the row, cut at
 * its end where a long version would not fit.
 */
export const WithBuild: Story = { args: { actions: preferences, build: 'Crewlet v1.4.0' } };

/** A long build, such as a pseudo-version, is cut at the rail's edge rather than wrapped, and read whole in its title. */
export const WithLongBuild: Story = {
  args: { actions: preferences, build: 'Crewlet v0.0.0-20261121174512-3fa94c1d02be' },
};

/** On the account page the row wears the rail's current-row lift and hairline. */
export const Current: Story = { args: { current: true, actions: preferences } };

/** An API token's session: a key for a face, since its initials would mean nothing. */
export const ApiToken: Story = {
  args: {
    avatar: <Avatar name="token:reader" kind="human" size="sm" icon={<KeyGlyph size="sm" />} decorative />,
    name: 'token:reader',
    detail: 'API token',
    actions: preferences,
  },
};

/**
 * The row as the reader's menu: pressing who you are opens your account and
 * signing out, under the one fact the row does not already say, your access.
 * Preferences keep their own control beside it.
 */
export const OpensTheirMenu: Story = {
  args: {
    href: undefined,
    menu: {
      header: (
        <span>
          Access <Tag size="xs">Admin</Tag>
        </span>
      ),
      items: [
        {
          key: 'account',
          label: 'Account settings',
          description: 'Password, two-step verification and sessions',
          icon: <UserGlyph />,
          onSelect: () => {},
        },
        { kind: 'separator', key: 'sep' },
        { key: 'out', label: 'Sign out', icon: <LogOutGlyph />, onSelect: () => {} },
        {
          key: 'everywhere',
          label: 'Sign out everywhere',
          description: 'Every device, and stops your tokens',
          icon: <LogOutGlyph />,
          danger: true,
          onSelect: () => {},
        },
      ],
    },
    actions: <IconButton label="Preferences" icon={<PaletteGlyph size="sm" />} size="sm" variant="ghost" />,
  },
};
