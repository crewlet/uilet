import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import {
  AppShell,
  BrandLockup,
  Button,
  CatalogTile,
  DirectoryList,
  ListDetail,
  NavGroup,
  NavItem,
  ObjectHeader,
  Section,
  SidebarNav,
  StatusDot,
  Tag,
  TileGrid,
} from '@crewlethq/ui';
import { CrewletIcon, VendorMark } from '@crewlethq/icons';

const list = (
  <DirectoryList
    label="Integrations"
    groups={[
      {
        key: 'chat',
        label: 'Chat',
        items: [
          { key: 'slack', href: '#slack', mark: <VendorMark vendor="slack" size="md" />, label: 'Slack', status: <StatusDot tone="success">Connected</StatusDot>, selected: true },
          { key: 'mattermost', href: '#mattermost', mark: <VendorMark vendor="mattermost" size="md" />, label: 'Mattermost' },
        ],
      },
      {
        key: 'code',
        label: 'Code',
        items: [{ key: 'github', href: '#github', mark: <VendorMark vendor="github" size="md" />, label: 'GitHub' }],
      },
    ]}
  />
);

const meta: Meta<typeof ListDetail> = {
  title: 'UI/ListDetail',
  component: ListDetail,
  args: { list, showing: 'detail' },
  argTypes: { showing: { control: 'inline-radio', options: ['list', 'detail'] } },
  /* In a box of a fixed height, as the shell's fill gives a screen: the detail scrolls on its own. */
  render: (args) => (
    <div style={{ height: 480 }}>
      <ListDetail {...args}>
        <ObjectHeader
          kind="Integration"
          mark={<VendorMark vendor="slack" size={36} />}
          title="Slack"
          status={<Tag variant="success">Connected</Tag>}
          description="Each agent posts as its own bot."
        />
        {Array.from({ length: 24 }, (_, i) => (
          <p key={i} style={{ margin: 0 }}>
            Delivery {24 - i}: a mention in #general.
          </p>
        ))}
      </ListDetail>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof ListDetail>;

/** A list beside the chosen item's detail. Below 640px of its own width only the pane `showing` names is drawn. */
export const Basic: Story = {};

/**
 * In a column 443px wide, on any window: what a screen is left beside an
 * aside the reader dragged wide. It folds by its own width, so the detail
 * takes the column rather than drawing 130px beside the list.
 */
export const NarrowColumn: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 443 }}>
        <Story />
      </div>
    ),
  ],
};

const VENDORS = ['github', 'gitlab', 'datadog', 'atlassian'] as const;

/** Where a box's content ends: its right edge less its border, scrollbar and pad. */
function contentEnd(element: Element): number {
  const box = element.getBoundingClientRect();
  return box.left + element.clientLeft + element.clientWidth - Number.parseFloat(getComputedStyle(element).paddingRight);
}

/**
 * ON A SCREEN THAT FILLS THE WINDOW, as an application shell's `fill` draws
 * it: the detail's scrollbar is the sheet's last pixel, and its content keeps
 * the screen's side inset inside it, so the header's Disconnect, a section's
 * action and the tiles' edge all end under the bar's last control and never
 * touch the scrollbar. The play function measures exactly that.
 */
export const InAFillScreen: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <AppShell
      fill
      sidebar={
        <AppShell.Rail header={<BrandLockup name="Crewlet" mark={<CrewletIcon />} href="#/" />}>
          <SidebarNav label="Navigation">
            <NavGroup label="Company">
              <NavItem label="Integrations" href="#/integrations" current />
            </NavGroup>
          </SidebarNav>
        </AppShell.Rail>
      }
      topbar={
        <AppShell.Topbar
          title="Integrations"
          actions={
            <Button size="small" variant="secondary">
              Ask
            </Button>
          }
        />
      }
    >
      <ListDetail {...args}>
        <ObjectHeader
          kind="Integration"
          mark={<VendorMark vendor="slack" size={36} />}
          title="Slack"
          status={<Tag variant="success">Connected</Tag>}
          description="Each agent posts as its own bot."
          actions={
            <Button size="small" variant="secondary">
              Disconnect
            </Button>
          }
        />
        <Section
          title="Also connected"
          actions={
            <Button size="small" variant="secondary">
              Add an app
            </Button>
          }
        >
          <TileGrid as="ul" columns={2}>
            {VENDORS.map((vendor) => (
              <CatalogTile
                key={vendor}
                as="li"
                density="compact"
                mark={<VendorMark vendor={vendor} size={20} />}
                title={vendor[0]!.toUpperCase() + vendor.slice(1)}
                status={<StatusDot tone="success">Connected</StatusDot>}
                description="Delivers to the agents it is shared with."
                action={
                  <Button size="small" variant="secondary">
                    Open
                  </Button>
                }
              />
            ))}
          </TileGrid>
        </Section>
        {Array.from({ length: 24 }, (_, i) => (
          <p key={i} style={{ margin: 0 }}>
            Delivery {24 - i}: a mention in #general.
          </p>
        ))}
      </ListDetail>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const find = (selector: string) => {
      const element = canvasElement.querySelector(selector);
      if (!element) throw new Error(`The story drew no ${selector}.`);
      return element;
    };
    const detail = find('.crewlet-list-detail__detail');
    const sheetEnd = find('.crewlet-app-shell__main').getBoundingClientRect().right;
    // The scroller is the pane's outermost box, on the sheet's edge.
    await expect(Math.abs(detail.getBoundingClientRect().right - sheetEnd)).toBeLessThan(0.5);
    // Its content ends where the bar's last control does, and every trailing
    // control in it ends there too.
    const end = contentEnd(detail);
    const ends = {
      bar: find('.crewlet-app-shell__actions button').getBoundingClientRect().right,
      header: find('.crewlet-object-header__actions button').getBoundingClientRect().right,
      section: find('.crewlet-section__actions button').getBoundingClientRect().right,
      tiles: Math.max(...[...canvasElement.querySelectorAll('.crewlet-catalog-tile')].map((tile) => tile.getBoundingClientRect().right)),
    };
    for (const [where, right] of Object.entries(ends)) {
      await expect({ where, off: Math.round(Math.abs(right - end) * 2) / 2 }).toEqual({ where, off: 0 });
    }
  },
};
