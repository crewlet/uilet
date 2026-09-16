import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { CrewletIcon } from '@crewlethq/icons';
import {
  AccountTreeGlyph,
  DashboardGlyph,
  DnsGlyph,
  GroupGlyph,
  KeyGlyph,
  ScheduleGlyph,
  SettingsGlyph,
  TerminalGlyph,
  TokenGlyph,
} from '@crewlethq/icons/glyphs';
import {
  AppShell,
  BrandLockup,
  Button,
  Callout,
  Count,
  Kbd,
  NavGroup,
  NavItem,
  PageHeader,
  SearchTrigger,
  SidebarNav,
  StatusDot,
  Tag,
  useAppShell,
} from '@crewlethq/ui';

/*
 * The shell fills the window it is in, so every story here is drawn in the
 * preview frame at whatever size that frame has. The narrow layout switches at
 * the shell breakpoint and follows the FRAME's width, which is what the
 * viewport below sizes: `Narrow` pins the frame under the breakpoint, and
 * `DrawerOpen` opens the same drawer from a control instead, which works at
 * any width.
 */
const UNDER_THE_BREAKPOINT = {
  /* Under `breakpoint.shell`, which is where the rail becomes a drawer. */
  narrow: { name: 'Under the shell breakpoint', styles: { width: '420px', height: '860px' }, type: 'mobile' },
} as const;

const meta: Meta<typeof AppShell> = {
  title: 'UI/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

/*
 * THE RAIL THE ENGINE RENDERS, as far as this package can draw it: the brand
 * over the company, the sections, the one badge allowed a status hue, and a
 * foot whose status line takes the rail's own insets so its mark lands on the
 * line every nav glyph above it sits on.
 *
 * It is the whole surface the Theme and Density toolbars are for. Switch
 * either and nothing here moves off that line: the two insets and every row
 * height scale together.
 */
function Rail({ context = 'Acme Holdings' }: { context?: string }) {
  return (
    <AppShell.Rail
      header={<BrandLockup name="Crewlet" mark={<CrewletIcon />} context={context} href="#/" />}
      footer={
        <>
          <AppShell.RailRow
            icon={<StatusDot tone="success" />}
            label="What this node is running, and since when"
            trailing={
              <Tag variant="info" size="xs">
                2 turns in flight
              </Tag>
            }
            onClick={() => {}}
          >
            engine connected
          </AppShell.RailRow>
          {/* The engine puts its theme and density switchers here too. They
              are the preview's own toolbar in this story, because a switcher
              in the canvas and a switcher in the toolbar write the same
              attribute on the same root and would undo each other. */}
          <AppShell.RailRow icon={<SettingsGlyph size="sm" />} label="Settings" onClick={() => {}}>
            Settings
          </AppShell.RailRow>
        </>
      }
    >
      <SidebarNav label="Sections">
        {/* The first run has no name, which a rail built from a list spells as
            an empty label: no heading box is drawn and no level is added. */}
        <NavGroup label="">
          <NavItem
            href="#/"
            label="Overview"
            icon={<DashboardGlyph size="sm" />}
            current
            badge={<Count value={3} label="need a person" />}
            badgeTone="attention"
          />
        </NavGroup>
        <NavGroup label="Company">
          <NavItem href="#/people" label="People" icon={<GroupGlyph size="sm" />} badge={<Count value="4 live" />} />
          <NavItem href="#/org" label="Org chart" icon={<AccountTreeGlyph size="sm" />} />
        </NavGroup>
        <NavGroup label="Work">
          <NavItem href="#/runs" label="Coding runs" icon={<TerminalGlyph size="sm" />} />
          <NavItem href="#/schedules" label="Schedules" icon={<ScheduleGlyph size="sm" />} />
        </NavGroup>
        <NavGroup label="Operations">
          <NavItem href="#/fleet" label="Fleet" icon={<DnsGlyph size="sm" />} />
          <NavItem href="#/spend" label="Spend and budgets" icon={<TokenGlyph size="sm" />} />
          <NavItem
            label="Secrets"
            icon={<KeyGlyph size="sm" />}
            disabledReason="Only an operator can read the names the fleet holds."
          />
        </NavGroup>
      </SidebarNav>
    </AppShell.Rail>
  );
}

function Topbar() {
  return (
    <AppShell.Topbar
      title="Overview"
      actions={<SearchTrigger shortcut={<Kbd keys={['Mod', 'k']} subtle />} keyshortcuts="Control+K Meta+K /" />}
    />
  );
}

function Screen({ children }: { children?: ReactNode }) {
  return (
    <>
      <PageHeader
        title="Overview"
        description="What needs a person, what the company is doing, and what it has cost."
        actions={<Button size="small">Refresh</Button>}
      />
      {children}
      {Array.from({ length: 12 }, (_, row) => (
        <p key={row} style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Row {row + 1} of a screen long enough to scroll, so the one scroll container is visible.
        </p>
      ))}
    </>
  );
}

export const Wide: Story = {
  render: () => (
    <AppShell sidebar={<Rail />} topbar={<Topbar />}>
      <Screen />
    </AppShell>
  ),
};

/** A banner reports; it does not nag. It stays put while the screen scrolls. */
export const WithABanner: Story = {
  render: () => (
    <AppShell
      sidebar={<Rail />}
      topbar={<Topbar />}
      banner={
        <Callout variant="warning">
          Reconnecting to the engine. Showing the last state received, and polling meanwhile.
        </Callout>
      }
    >
      <Screen />
    </AppShell>
  ),
};

/**
 * Below the shell breakpoint the rail is gone from the layout and the control
 * that opens it as a drawer appears at the head of the bar. The search trigger
 * keeps its name where it has dropped its label.
 */
export const Narrow: Story = {
  parameters: { viewport: { options: UNDER_THE_BREAKPOINT } },
  globals: { viewport: { value: 'narrow' } },
  render: () => (
    <AppShell sidebar={<Rail />} topbar={<Topbar />}>
      <Screen />
    </AppShell>
  ),
};

/**
 * The drawer, opened from a control rather than from the toggle, so it can be
 * seen without narrowing the frame. Escape closes it, Tab stays inside it, and
 * focus goes back to whatever opened it.
 */
export const DrawerOpen: Story = {
  render: function DrawerOpenStory() {
    function OpenIt() {
      const { openDrawer } = useAppShell();
      return (
        <Button size="small" variant="secondary" onClick={openDrawer}>
          Open the rail as a drawer
        </Button>
      );
    }
    return (
      <AppShell sidebar={<Rail />} topbar={<Topbar />}>
        <Screen>
          <OpenIt />
        </Screen>
      </AppShell>
    );
  },
};

/**
 * A screen that draws to the bottom of the window: the scroller stops
 * scrolling and the content column takes the height that is left, which is
 * what a canvas or a split view needs.
 */
export const Fill: Story = {
  render: () => (
    <AppShell sidebar={<Rail />} topbar={<AppShell.Topbar title="Org chart" />} fill>
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'grid',
          placeItems: 'center',
          border: '1px dashed var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-secondary)',
        }}
      >
        A canvas that fills the height left under the bar.
      </div>
    </AppShell>
  ),
};

/**
 * THE FOOT CLAIMS WHAT LANDS IN IT. `AppShell.RailRow` is the row this package
 * draws, but an application with a status control of its own reaches for that
 * one, and the engine dashboard does: a tertiary Button. Dropped in, it takes
 * the rail's two insets, its quiet ink and its left alignment, so the two rows
 * below are the same row drawn by two components rather than a rail row and a
 * centred control on a toolbar's inset.
 */
export const FootTakesADroppedControl: Story = {
  render: () => (
    <AppShell
      sidebar={
        <AppShell.Rail
          header={<BrandLockup name="Crewlet" mark={<CrewletIcon />} context="Acme Holdings" href="#/" />}
          footer={
            <>
              <Button variant="tertiary" size="small" leadingIcon={<StatusDot tone="success" />}>
                engine connected
              </Button>
              <AppShell.RailRow icon={<SettingsGlyph size="sm" />} label="Settings" onClick={() => {}}>
                Settings
              </AppShell.RailRow>
            </>
          }
        >
          <SidebarNav label="Sections">
            <NavGroup label="">
              <NavItem href="#/" label="Overview" icon={<DashboardGlyph size="sm" />} current />
            </NavGroup>
            <NavGroup label="Operations">
              <NavItem href="#/fleet" label="Fleet" icon={<DnsGlyph size="sm" />} />
            </NavGroup>
          </SidebarNav>
        </AppShell.Rail>
      }
      topbar={<Topbar />}
    >
      <Screen />
    </AppShell>
  ),
};

/** Without a rail there is no drawer and no control for one. */
export const NoRail: Story = {
  render: () => (
    <AppShell topbar={<AppShell.Topbar title="Sign in" />}>
      <PageHeader title="Sign in" description="A shell with one column and no navigation." />
    </AppShell>
  ),
};
