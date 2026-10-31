import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { CrewletIcon } from '@crewlethq/icons';
import {
  BotGlyph,
  HouseGlyph,
  InboxGlyph,
  MessageSquareGlyph,
  PencilGlyph,
  RotateCcwClockGlyph,
  SquareKanbanGlyph,
} from '@crewlethq/icons/glyphs';
import {
  AppShell,
  BrandLockup,
  Button,
  Card,
  CompactNav,
  CompactNavItem,
  IconButton,
  NavItem,
  PeekRail,
  SegmentedControl,
  SidebarNav,
  SidePanel,
  Stack,
  Text,
  Textarea,
  useAppShell,
  useMediaMatch,
  useStoredWidth,
  type AppShellAsideShape,
  type AppShellProps,
  type AppShellRailShape,
} from '@crewlethq/ui';

/*
 * THE ASIDE: a panel the frame keeps beside every screen, the assistant
 * being the first. Every story here draws the whole frame, so each follows
 * the preview frame's width. The shape is the HOST's decision, from its own
 * arithmetic: these stories either pin it (to show one shape) or decide it
 * the way an application would, from the window's width.
 */

const meta: Meta<typeof AppShell> = {
  title: 'UI/AppShellAside',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

const MIN = 360;
const MAX = 640;
const RESTING = 420;

function Rail() {
  // In whichever shape the shell draws, so a foldable frame folds it.
  const { rail } = useAppShell();
  return (
    <AppShell.Rail header={<BrandLockup name="Crewlet" mark={<CrewletIcon />} href="#/" />}>
      {rail === 'compact' ? (
        <CompactNav label="Sections">
          <CompactNavItem href="#/" label="Home" icon={<HouseGlyph size="sm" />} />
          <CompactNavItem href="#/inbox" label="Inbox" icon={<InboxGlyph size="sm" />} />
          <CompactNavItem href="#/work" label="Work" icon={<SquareKanbanGlyph size="sm" />} current />
        </CompactNav>
      ) : (
        <SidebarNav label="Sections">
          <NavItem href="#/" label="Home" icon={<HouseGlyph size="sm" />} />
          <NavItem href="#/inbox" label="Inbox" icon={<InboxGlyph size="sm" />} />
          <NavItem href="#/work" label="Work" icon={<SquareKanbanGlyph size="sm" />} current />
        </SidebarNav>
      )}
    </AppShell.Rail>
  );
}

const TASKS = Array.from({ length: 24 }, (_, i) => ({
  key: `ENG-${140 + i}`,
  title: [
    'Rotate the signing key before the audit window',
    'Draft the onboarding checklist for new seats',
    'Reconcile last month’s token spend by team',
    'Fix the flaky retry in the webhook relay',
  ][i % 4]!,
}));

/** A list that yields to its sheet's own width: the page the aside pushes. */
function TaskList({ onPeek }: { onPeek?: (key: string) => void }) {
  return (
    <Card>
      <Stack gap={1}>
        {TASKS.map((task) => (
          <Button
            key={task.key}
            variant="ghost"
            size="small"
            onClick={onPeek ? () => onPeek(task.key) : undefined}
            style={{ justifyContent: 'flex-start' }}
          >
            {`${task.key}  ${task.title}`}
          </Button>
        ))}
      </Stack>
    </Card>
  );
}

/** The assistant's panel, as an application composes it from a SidePanel. */
function Assistant({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel
      title="Ask Crewlet"
      icon={<BotGlyph size="md" />}
      onClose={onClose}
      labels={{ close: () => 'Close Ask Crewlet' }}
      actions={
        <>
          <IconButton size="sm" variant="ghost" label="New conversation" icon={<PencilGlyph size="sm" />} />
          <IconButton size="sm" variant="ghost" label="Conversations" icon={<RotateCcwClockGlyph size="sm" />} />
        </>
      }
      footer={<Textarea aria-label="Message" rows={2} placeholder="Ask about this page" />}
    >
      <Stack gap={3}>
        <Text>Ask about anything on this page, or ask for a change. You approve every change before it is made.</Text>
        <Text variant="caption">Answers use your own access, never more.</Text>
      </Stack>
    </SidePanel>
  );
}

/** The window widths an application would decide the shape at. */
function useShapeFromWidth(): AppShellAsideShape {
  const phone = useMediaMatch('(width < 640px)');
  const roomy = useMediaMatch('(width >= 1160px)');
  return phone ? 'sheet' : roomy ? 'column' : 'overlay';
}

function Frame({
  shape,
  open: startOpen = true,
  resizable = true,
  foldable = false,
  modal,
  peek,
  children,
}: {
  shape: AppShellAsideShape | 'auto';
  open?: boolean;
  modal?: boolean;
  resizable?: boolean;
  foldable?: boolean;
  peek?: (asideColumn: boolean) => Pick<AppShellProps, 'peek' | 'peekShape'>;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  const [rail, setRail] = useState<AppShellRailShape>('full');
  const decided = useShapeFromWidth();
  const asideShape = shape === 'auto' ? decided : shape;
  const stored = useStoredWidth({ key: 'crewlet.storybook.aside.width', min: MIN, max: MAX });
  const width = stored.width ?? RESTING;
  return (
    <AppShell
      sidebar={<Rail />}
      {...(foldable ? { rail, onRailChange: setRail, railFoldKeys: ['Mod', '\\'] } : null)}
      topbar={
        <AppShell.Topbar
          title="Work"
          actions={
            <Button variant="secondary" size="small" leadingIcon={<MessageSquareGlyph size="sm" />} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              Ask
            </Button>
          }
        />
      }
      aside={open ? <Assistant onClose={() => setOpen(false)} /> : null}
      asideShape={asideShape}
      asideModal={modal}
      asideWidth={width}
      asideReserve={640}
      asideLabel="Ask Crewlet"
      onAsideClose={() => setOpen(false)}
      asideResize={
        resizable
          ? {
              min: MIN,
              max: MAX,
              defaultValue: RESTING,
              onChange: stored.setWidth,
              onCommit: stored.commitWidth,
              label: 'Resize the Ask Crewlet panel',
            }
          : undefined
      }
      {...(peek ? peek(open && asideShape === 'column') : null)}
    >
      {children ?? <TaskList />}
    </AppShell>
  );
}

/**
 * A COLUMN: a third track on the frame, a second sheet beside the page's.
 * Opening it pushes the page narrower; the bar, the scroller and the sticky
 * heads are the page's own and only narrower. Drag the seam between the two
 * sheets, or focus it with Tab and use the arrow keys.
 */
export const Column: Story = {
  render: () => <Frame shape="column" />,
};

/**
 * THE CAP FOLLOWS A FOLDING RAIL. On a window where the page's floor (640px
 * here) leaves the column less than its width, the column takes what is
 * left, and that is the grid's own arithmetic over the rail's LIVE width:
 * fold the rail from its head and the column widens with it, frame by
 * frame, and unfold it and the column gives the room back the same way. It
 * never jumps at either end of the motion.
 */
export const CapFollowsAFoldingRail: Story = {
  render: () => <Frame shape="column" foldable />,
};

/**
 * AN OVERLAY: where the window cannot hold the page and the panel side by
 * side. It covers the page's end edge behind a veil, a modal dialog: Tab
 * stays in it, Escape or a press on the veil closes it, and focus returns
 * to Ask.
 */
export const Overlay: Story = {
  render: () => <Frame shape="overlay" />,
};

/**
 * A NON-MODAL OVERLAY (`asideModal={false}`): the same panel over the page's
 * end edge, with no veil and no trap, so the page beside it stays live. It is
 * a complementary region; Escape from inside it closes it and focus returns
 * to Ask, while Tab and presses on the page are the page's own.
 */
export const OverlayNonModal: Story = {
  render: () => <Frame shape="overlay" modal={false} />,
};

/** A SHEET: the whole window on a phone, modal in the same way. */
export const Sheet: Story = {
  render: () => <Frame shape="sheet" />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

/**
 * RESIZING BY KEYBOARD: Tab to the grip in the seam (a separator that says
 * its width), then ArrowLeft widens by 16px, Shift with an arrow by 64px,
 * Home and End go to the narrowest and widest, and Enter puts it back at
 * 420px. The width is kept in this browser and comes back on reload.
 */
export const ResizingByKeyboard: Story = {
  render: () => <Frame shape="column" />,
};

/**
 * DECIDED BY THE HOST: the shape an application would choose from the
 * window, a column from 1160px, an overlay down to 640px, a sheet below.
 * Resize the preview to watch the panel change shape without losing what is
 * typed in it.
 */
export const DecidedByWidth: Story = {
  render: () => <Frame shape="auto" />,
};

/**
 * THE PEEK BESIDE THE ASSISTANT: both are right-hand panels, and they never
 * stack two columns deep. While the assistant is a column, a peek opened
 * from the list is a drawer over the page; close the assistant and the peek
 * returns to a column of the sheet. Press a task to peek it.
 */
export const PeekDemotedToDrawer: Story = {
  render: function Render() {
    const [peeked, setPeeked] = useState<string | null>('ENG-141');
    return (
      <Frame
        shape="column"
        peek={(asideColumn) => ({
          peekShape: asideColumn ? ('drawer' as const) : ('column' as const),
          peek: peeked ? (
            <PeekRail label="Task detail" onClose={() => setPeeked(null)} openHref={`#/work/${peeked}`} reserve={444}>
              <Stack gap={2} style={{ paddingTop: 'var(--spacing-4)' }}>
                <Text variant="caption" mono>
                  {peeked}
                </Text>
                <Text>{TASKS.find((task) => task.key === peeked)?.title}</Text>
              </Stack>
            </PeekRail>
          ) : null,
        })}
      >
        <TaskList onPeek={setPeeked} />
      </Frame>
    );
  },
};

/** Every shape from one control, for comparing them at one window size. */
export const Shapes: Story = {
  render: function Render() {
    const [shape, setShape] = useState<AppShellAsideShape>('column');
    return (
      <Frame shape={shape}>
        <Stack gap={4}>
          <SegmentedControl<AppShellAsideShape>
            label="Shape"
            semantics="radio"
            value={shape}
            onValueChange={setShape}
            options={[
              { value: 'column', label: 'Column' },
              { value: 'overlay', label: 'Overlay' },
              { value: 'sheet', label: 'Sheet' },
            ]}
          />
          <TaskList />
        </Stack>
      </Frame>
    );
  },
};
