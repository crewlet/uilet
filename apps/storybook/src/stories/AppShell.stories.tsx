import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { CrewletIcon } from '@crewlethq/icons';
import {
  ActivityGlyph,
  BookOpenGlyph,
  CircleCheckGlyph,
  CoinsGlyph,
  HouseGlyph,
  InboxGlyph,
  KeyGlyph,
  LayoutDashboardGlyph,
  NetworkGlyph,
  PinGlyph,
  PlusGlyph,
  ServerGlyph,
  SettingsGlyph,
  SquareKanbanGlyph,
} from '@crewlethq/icons/glyphs';
import {
  AppShell,
  BrandLockup,
  Button,
  Callout,
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
 * THE RAIL THE APPROVED DESIGN DRAWS, as far as this package can draw it: the
 * brand over the company, the three destinations every reader starts from
 * (the inbox carrying the one badge in the chrome, the reader's own work a
 * quiet count), the workspace, the projects under a heading that can add one
 * and each led by its key, the pinned views, and a foot whose status line
 * takes the rail's own insets so its mark lands on the line every nav glyph
 * above it sits on. Beside it the screen floats on the sheet, inset from the
 * frame.
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
          {/* The engine puts its theme and density switchers here too. They
              are the preview's own toolbar in this story, because a switcher
              in the canvas and a switcher in the toolbar write the same
              attribute on the same root and would undo each other. */}
          <AppShell.RailRow icon={<SettingsGlyph size="sm" />} label="Settings" onClick={() => {}}>
            Settings
          </AppShell.RailRow>
          {/* The design's status block: the state over what it is made of,
              and the value beside the words when both fit on the rail and
              under them when, as here, they do not. The words are never cut. */}
          <AppShell.RailRow
            icon={<StatusDot tone="success" />}
            detail="3 nodes · config epoch 42"
            label="Engine healthy, 2 turns in flight: open the engine panel"
            trailing={
              <Tag variant="info" size="xs">
                2 turns in flight
              </Tag>
            }
            onClick={() => {}}
          >
            Engine healthy
          </AppShell.RailRow>
        </>
      }
    >
      <SidebarNav label="Sections">
        {/* The first run has no name, which a rail built from a list spells as
            an empty label: no heading box is drawn and no level is added. */}
        <NavGroup label="">
          <NavItem href="#/" label="Home" icon={<HouseGlyph size="sm" />} current />
          <NavItem href="#/inbox" label="Inbox" icon={<InboxGlyph size="sm" />} badge={{ value: 5, label: 'unread' }} />
          <NavItem href="#/mine" label="My work" icon={<CircleCheckGlyph size="sm" />} count={{ value: 3, label: 'open' }} />
        </NavGroup>
        <NavGroup label="Workspace">
          <NavItem href="#/work" label="Work" icon={<SquareKanbanGlyph size="sm" />} />
          <NavItem
            href="#/agents"
            label="Agents"
            icon={<NetworkGlyph size="sm" />}
            count={{ value: 4, label: 'working', mark: <StatusDot tone="info" pulse /> }}
          />
          <NavItem href="#/live" label="Live" icon={<ActivityGlyph size="sm" />} />
          <NavItem href="#/knowledge" label="Knowledge" icon={<BookOpenGlyph size="sm" />} />
          <NavItem href="#/spend" label="Spend" icon={<CoinsGlyph size="sm" />} />
        </NavGroup>
        <NavGroup label="Projects" action={{ label: 'New project', icon: <PlusGlyph size="sm" />, onClick: () => {} }}>
          <NavItem href="#/work/eng" label="Core platform" lead="ENG" count={{ value: 23, label: 'open' }} />
          <NavItem href="#/work/prod" label="Product" lead="PROD" count={{ value: 11, label: 'open' }} />
          <NavItem href="#/work/lead" label="Leadership" lead="LEAD" count={{ value: 4, label: 'open' }} />
        </NavGroup>
        <NavGroup label="Pinned">
          <NavItem href="#/views/blocked" label="Blocked, org-wide" icon={<PinGlyph size="sm" />} count={{ value: 2, label: 'open' }} />
          <NavItem href="#/views/release" label="2.4 release" icon={<PinGlyph size="sm" />} count={{ value: 9, label: 'open' }} />
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
      title="Home"
      actions={
        <SearchTrigger variant="toolbar" shortcut={<Kbd keys={['Mod', 'k']} subtle />} keyshortcuts="Control+K Meta+K /" />
      }
    />
  );
}

function Screen({ children }: { children?: ReactNode }) {
  return (
    <>
      <PageHeader
        title="Home"
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

/**
 * The rail on the frame, and the screen on a sheet floated beside it: inset
 * from the frame on its top, right and bottom, drawn round with the plain
 * hairline and rounded at the sheet's corner. The bar and the one scroller are
 * inside the sheet, so the screen scrolls under the bar and is clipped by the
 * corner.
 */
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
 * Below the shell breakpoint the rail is gone from the layout, the sheet is the
 * whole window (its inset, corner and hairline collapsed to nothing), and the
 * control that opens the rail as a drawer appears at the head of the bar. The search trigger
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
 * one, and the engine dashboard does: a ghost Button. Dropped in, it takes
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
              <Button variant="ghost" size="small" leadingIcon={<StatusDot tone="success" />}>
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
              <NavItem href="#/" label="Overview" icon={<LayoutDashboardGlyph size="sm" />} current />
            </NavGroup>
            <NavGroup label="Operations">
              <NavItem href="#/fleet" label="Fleet" icon={<ServerGlyph size="sm" />} />
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

/**
 * Without a rail there is no drawer and no control for one, and the sheet is
 * inset from the frame on all four sides.
 */
export const NoRail: Story = {
  render: () => (
    <AppShell topbar={<AppShell.Topbar title="Sign in" />}>
      <PageHeader title="Sign in" description="A shell with one column and no navigation." />
    </AppShell>
  ),
};
