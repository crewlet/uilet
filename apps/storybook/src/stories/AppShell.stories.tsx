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
  PaletteGlyph,
  PinGlyph,
  PlusGlyph,
  ServerGlyph,
  SettingsGlyph,
  SlidersVerticalGlyph,
  SquareKanbanGlyph,
  TriangleAlertGlyph,
} from '@crewlethq/icons/glyphs';
import {
  AccountRow,
  AppShell,
  Avatar,
  BrandLockup,
  Button,
  ButtonLink,
  Callout,
  DescriptionList,
  IconButton,
  IconButtonLink,
  Inline,
  Kbd,
  NavGroup,
  NavItem,
  PageHeader,
  Popover,
  SearchTrigger,
  SidebarNav,
  Spacer,
  Stack,
  StatusDot,
  Tag,
  Text,
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

/** The alarms the engine panel lists, by their names in words. */
const ALARMS = [
  'Backup age',
  'Trim blocked: tracker',
  'Trim blocked: pages',
  'Trim blocked: vectors',
  'Trim blocked: usage',
];

/**
 * THE ENGINE PANEL, as the engine dashboard composes it: one row in the foot
 * that says the state in words and how many alarms stand, and a press that
 * opens what the row stands for. The row is the panel's trigger as it is, so
 * the panel is anchored to it, the row says it opens something, and it is
 * drawn open while the panel is.
 *
 * The panel is the application's, built from the kit: the state with its dot,
 * the node, the facts as a fitted description list, and a link to each place
 * that acts on them. The layout and the inset here are the story's own; an
 * application spends its own on them.
 */
/** What the engine panel says, from the foot's row or the head's status. */
function EnginePanelBody({ alarms, words }: { alarms: string[]; words: string }) {
  const serving = alarms.length > 0;
  return (
  <Stack gap={3} style={{ padding: 'var(--spacing-3)' }}>
    <Inline gap={2}>
      <StatusDot tone="success">
        <Text variant="cell">{words}</Text>
      </StatusDot>
      <Spacer />
      <Text variant="caption" mono>
        node-a
      </Text>
    </Inline>
    <DescriptionList fit dense>
      <DescriptionList.Item term="Nodes">1 live</DescriptionList.Item>
      <DescriptionList.Item term="Config">Epoch 8</DescriptionList.Item>
      <DescriptionList.Item term="Up">2 days</DescriptionList.Item>
      <DescriptionList.Item term="Alarms">
        {serving ? (
          <Stack as="ul" gap={1}>
            {alarms.map((alarm) => (
              <li key={alarm}>{alarm}</li>
            ))}
          </Stack>
        ) : (
          'None'
        )}
      </DescriptionList.Item>
    </DescriptionList>
    <Inline gap={2} wrap>
      <ButtonLink href="#/settings/nodes/node-a" variant="secondary" size="small">
        Open node
      </ButtonLink>
      {serving ? (
        <ButtonLink href="#/settings/backups" variant="secondary" size="small">
          Open alarms
        </ButtonLink>
      ) : null}
    </Inline>
  </Stack>
  );
}

/** The alarms as a rail count, or nothing on a healthy engine. */
function alarmCount(alarms: string[]) {
  return alarms.length > 0
    ? {
        value: alarms.length,
        label: alarms.length === 1 ? 'alarm' : 'alarms',
        mark: <TriangleAlertGlyph size="xs" />,
        tone: 'warning' as const,
      }
    : undefined;
}

function EngineRow({ alarms = ALARMS, defaultOpen = false }: { alarms?: string[]; defaultOpen?: boolean }) {
  const words = alarms.length > 0 ? 'Engine serving' : 'Engine healthy';
  return (
    <Popover
      label="Engine"
      side="top"
      defaultOpen={defaultOpen}
      trigger={(_open, toggle) => (
        <AppShell.RailRow icon={<StatusDot tone="success" />} count={alarmCount(alarms)} onClick={toggle}>
          {words}
        </AppShell.RailRow>
      )}
    >
      <EnginePanelBody alarms={alarms} words={words} />
    </Popover>
  );
}

/**
 * The same state, compact, at the end of the head's line: a dot and the
 * alarms, its words its name and title, and the same panel below it.
 */
function EngineStatus({ alarms = ALARMS, defaultOpen = false }: { alarms?: string[]; defaultOpen?: boolean }) {
  const words = alarms.length > 0 ? 'Engine serving' : 'Engine healthy';
  return (
    <Popover
      label="Engine"
      side="bottom"
      align="start"
      defaultOpen={defaultOpen}
      trigger={(_open, toggle) => (
        <AppShell.RailStatus icon={<StatusDot tone="success" />} count={alarmCount(alarms)} onClick={toggle}>
          {words}
        </AppShell.RailStatus>
      )}
    >
      <EnginePanelBody alarms={alarms} words={words} />
    </Popover>
  );
}

/*
 * THE RAIL THE APPROVED DESIGN DRAWS, as far as this package can draw it: the
 * brand over the company, the three destinations every reader starts from
 * (the inbox carrying the one badge in the chrome, the reader's own work a
 * quiet count), the workspace, the projects under a heading that can add one
 * and each led by its key, the pinned views, and a foot whose rows take the
 * rail's own insets and grammar, so their marks land on the line every nav
 * glyph above them sits on and their words where the nav's words start.
 * Beside it the screen floats on the sheet, inset from the frame.
 *
 * It is the whole surface the Theme and Density toolbars are for. Switch
 * either and nothing here moves off that line: the two insets and every row
 * height scale together.
 */
function Rail({
  context = 'Acme Holdings',
  foot,
  status,
}: {
  context?: string;
  foot?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <AppShell.Rail
      header={<BrandLockup name="Crewlet" mark={<CrewletIcon />} context={context} href="#/" />}
      status={status}
      // THE RAIL'S FIELD in its own slot: on the nav's gutter, its glyph on the
      // rows' glyph column, with no wrapper of the application's own.
      search={
        <SearchTrigger
          variant="rail"
          label="Ask or jump to…"
          shortcut={<Kbd keys={['Mod', 'k']} subtle />}
          keyshortcuts="Control+K Meta+K"
        />
      }
      footer={
        <>
          {/* The engine puts its theme and density switchers here too. They
              are the preview's own toolbar in this story, because a switcher
              in the canvas and a switcher in the toolbar write the same
              attribute on the same root and would undo each other. */}
          <AppShell.RailRow icon={<SettingsGlyph size="sm" />} label="Settings" onClick={() => {}}>
            Settings
          </AppShell.RailRow>
          {foot ?? (status ? null : <EngineRow />)}
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
 * corner. The bar takes the content's inset on both sides, and the scroller's
 * gutter at its end, so the Refresh button ends under the search field over it
 * whether or not the platform draws its scrollbars in the layout.
 */
export const Wide: Story = {
  render: () => (
    <AppShell sidebar={<Rail />} topbar={<Topbar />}>
      <Screen />
    </AppShell>
  ),
};

/**
 * The engine panel, open: the row in the foot is drawn open while the panel
 * stands over the rail above it, anchored to the row's start. Escape closes
 * it and hands focus back to the row; so does a press anywhere else.
 */
export const EnginePanel: Story = {
  render: () => (
    <AppShell sidebar={<Rail foot={<EngineRow defaultOpen />} />} topbar={<Topbar />}>
      <Screen />
    </AppShell>
  ),
};

/** With nothing standing the row says so in words and carries no count. */
export const EnginePanelHealthy: Story = {
  render: () => (
    <AppShell sidebar={<Rail foot={<EngineRow alarms={[]} defaultOpen />} />} topbar={<Topbar />}>
      <Screen />
    </AppShell>
  ),
};

/**
 * The design's status block: the state over what it is made of, on the card
 * rung inside a hairline, and the value beside the words when both fit on the
 * rail and under them when, as here, they do not. The words are never cut.
 */
export const StatusBlock: Story = {
  render: () => (
    <AppShell
      sidebar={
        <Rail
          foot={
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
          }
        />
      }
      topbar={<Topbar />}
    >
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
 * focus goes back to whatever opened it. The engine row in its foot opens its
 * panel above the drawer, which is where a surface opened from the drawer is
 * drawn: Escape closes the panel first, then the drawer.
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
 * EVERY COMPACT ROW IN THE FOOT STANDS ON THE NAV'S TWO COLUMNS: its mark
 * centred on the column every nav glyph above it is centred on, and its words
 * starting on the line every nav word starts on. The engine row's transparent
 * boundary spends a pixel of its pad rather than adding one. Hold a straight
 * edge to Home, Settings and the engine row: one line. The account row is the
 * one tall row: a medium badge in a 44px row, inset by the 6px it has above
 * and below it, with the name a step after it.
 */
export const FootRowsOnTheNavColumns: Story = {
  render: () => (
    <AppShell
      sidebar={
        <Rail
          foot={
            <>
              <EngineRow />
              <AccountRow
                avatar={<Avatar name="Lee Park" kind="human" size="md" ring="brand" decorative />}
                name="Lee Park"
                detail="Admin"
                href="#/account"
              />
            </>
          }
        />
      }
      topbar={<Topbar />}
    >
      <Screen />
    </AppShell>
  ),
};

/**
 * THE ENGINE'S STATE IN THE HEAD. A state the application reports stands at
 * the end of the head's line (`status`), compact: the dot and the alarms, its
 * words in its name and title, and the panel opening below it. The name
 * truncates at one place whatever the count says, because the status
 * reserves its width, and the foot keeps only what a reader reaches for
 * rarely. It stands in the drawer's head the same way.
 */
export const EngineStatusInTheHead: Story = {
  render: () => (
    <AppShell
      sidebar={
        <Rail
          context="FairSplit"
          status={<EngineStatus />}
          foot={
            <AccountRow
              avatar={<Avatar name="Lee Park" kind="human" size="md" ring="brand" decorative />}
              name="Lee Park"
              detail="Admin · via API token review"
              href="#/account"
              // SETTINGS AS ITS GLYPH beside Preferences: a link, current on a
              // Settings page, and the foot is the reader's row alone.
              actions={
                <>
                  <IconButtonLink
                    label="Settings"
                    href="#/settings"
                    icon={<SlidersVerticalGlyph size="sm" />}
                    size="sm"
                  />
                  <IconButton label="Preferences" icon={<PaletteGlyph size="sm" />} size="sm" variant="ghost" />
                </>
              }
            />
          }
        />
      }
      topbar={<Topbar />}
    >
      <Screen />
    </AppShell>
  ),
};

/** A healthy engine draws its dot alone, and the name keeps the same room. */
export const EngineStatusHealthy: Story = {
  render: () => (
    <AppShell sidebar={<Rail context="FairSplit" status={<EngineStatus alarms={[]} />} />} topbar={<Topbar />}>
      <Screen />
    </AppShell>
  ),
};

/**
 * THE FOOT IS THE COMPACT STEP. What a reader reaches for rarely (Settings,
 * the engine's state) stands on the small control step, 26px, on a 2px gap
 * and a 4px inset, while the nav above keeps its 30px rows. Who is signed in
 * is the exception: the account row stands 44px tall around a 32px badge,
 * with the name in the nav's word size. Every row keeps its order, its
 * columns, its glyphs and its words, and every target still clears 24px.
 */
export const CompactFoot: Story = {
  render: () => (
    <AppShell
      sidebar={
        <Rail
          foot={
            <>
              <EngineRow />
              <AccountRow
                avatar={<Avatar name="Lee Park" kind="human" size="md" ring="brand" decorative />}
                name="Lee Park"
                detail="Admin · lee@acme.test"
                href="#/account"
                actions={<IconButton label="Preferences" icon={<PaletteGlyph size="sm" />} size="sm" variant="ghost" />}
              />
            </>
          }
        />
      }
      topbar={<Topbar />}
    >
      <Screen />
    </AppShell>
  ),
};

/**
 * THE FOOT CLAIMS WHAT LANDS IN IT. `AppShell.RailRow` is the row this package
 * draws, but an application with a status control of its own reaches for that
 * one: a ghost Button. Dropped in, it takes the rail's two insets, its left
 * alignment and the grammar of a control in the rail, so the two rows below
 * are the same row drawn by two components rather than a rail row and a
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
