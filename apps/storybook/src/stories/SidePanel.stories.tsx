import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { BotGlyph, PencilGlyph, RotateCcwClockGlyph } from '@crewlethq/icons/glyphs';
import {
  Button,
  ChatThread,
  IconButton,
  MessageBubble,
  Prose,
  SegmentedControl,
  SIDE_PANEL_MAX_WIDTH,
  SIDE_PANEL_MIN_WIDTH,
  SIDE_PANEL_WIDTH,
  SidePanel,
  SidePanelFrame,
  Stack,
  Text,
  Textarea,
  useStoredWidth,
  type SidePanelShape,
} from '@crewlethq/ui';

/*
 * A panel beside what the reader works on, in a frame that lays it beside
 * the content, over its end edge, or over all of it. In the application
 * shell the same panel stands in the shell's aside (see AppShellAside).
 */

const meta: Meta<typeof SidePanel> = {
  title: 'UI/SidePanel',
  component: SidePanel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SidePanel>;

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${i + 1}: a line of the content the panel stands beside`);

function Content({ onOpen }: { onOpen: () => void }) {
  return (
    <Stack gap={2} style={{ padding: 'var(--spacing-5)' }}>
      <div>
        <Button variant="secondary" size="small" onClick={onOpen}>
          Open the panel
        </Button>
      </div>
      {ROWS.map((row) => (
        <Text key={row}>{row}</Text>
      ))}
    </Stack>
  );
}

/** A conversation for the flush body: the thread scrolls and insets itself. */
function Thread() {
  return (
    <ChatThread label="Conversation">
      {ROWS.slice(0, 6).flatMap((row, index) => [
        <MessageBubble key={`q${index}`} from="self">
          What does this say? ({index + 1})
        </MessageBubble>,
        <Prose key={`a${index}`} measure="narrow">
          <p>{row}.</p>
        </Prose>,
      ])}
    </ChatThread>
  );
}

function Demo({
  shape,
  focusComposer = false,
  thread = false,
}: {
  shape?: SidePanelShape;
  focusComposer?: boolean;
  thread?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const stored = useStoredWidth({ key: 'crewlet.storybook.side-panel.width', min: SIDE_PANEL_MIN_WIDTH, max: SIDE_PANEL_MAX_WIDTH });
  const composer = useRef<HTMLTextAreaElement>(null);
  return (
    <div style={{ height: '100dvh', display: 'grid' }}>
      <SidePanelFrame
        shape={shape}
        reserve={480}
        bodyLabel="Content"
        panel={
          open ? (
            <SidePanel
              title="Crewlet Assistant"
              icon={<BotGlyph size="md" />}
              onClose={() => setOpen(false)}
              resizable
              width={stored.width ?? SIDE_PANEL_WIDTH}
              onWidthChange={stored.setWidth}
              onWidthCommit={stored.commitWidth}
              initialFocus={focusComposer ? composer : 'heading'}
              flush={thread}
              actions={
                <>
                  <IconButton size="sm" variant="ghost" label="New conversation" icon={<PencilGlyph size="sm" />} />
                  <IconButton size="sm" variant="ghost" label="Conversations" icon={<RotateCcwClockGlyph size="sm" />} />
                </>
              }
              footer={<Textarea ref={composer} aria-label="Message" rows={2} placeholder="Ask about this page" />}
            >
              {thread ? (
                <Thread />
              ) : (
                <Stack gap={3}>
                  <Text>The head stands at the page bar's height. The body scrolls under it, and the foot stays in reach.</Text>
                  {ROWS.slice(0, 12).map((row) => (
                    <Text key={row} variant="caption">
                      {row}
                    </Text>
                  ))}
                </Stack>
              )}
            </SidePanel>
          ) : null
        }
      >
        <Content onOpen={() => setOpen(true)} />
      </SidePanelFrame>
    </div>
  );
}

/** A COLUMN beside the content, which narrows to make room and stays reachable with Tab. */
export const ColumnBesideAList: Story = { render: () => <Demo shape="column" /> };

/** A DRAWER over the content's end edge, lifted off it, with no veil and no trap. */
export const DrawerOverANarrowPage: Story = { render: () => <Demo shape="drawer" /> };

/** A SHEET over the whole frame on a phone: a modal dialog, Escape closes it. */
export const SheetOnAPhone: Story = {
  render: () => <Demo shape="sheet" />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

/**
 * RESIZABLE WITH THE KEYBOARD: Tab to the grip on the panel's edge, then the
 * arrows move it by 16px (64px with Shift), Home and End go to the bounds,
 * Enter resets it. The width is capped so the content keeps 480px.
 */
export const ResizableWithKeyboard: Story = { render: () => <Demo shape="column" /> };

/** MEASURED BY THE FRAME: with no shape, a column from 960px, a drawer below, the whole frame under 640px. */
export const MeasuredByTheFrame: Story = { render: () => <Demo /> };

/** FOCUS TO THE COMPOSER on open, where the panel exists to be typed into. */
export const FocusToTheComposer: Story = { render: () => <Demo shape="column" focusComposer /> };

/**
 * FLUSH, FOR CONTENT THAT OWNS ITS EDGES: the body draws no inset, so a
 * `ChatThread`, which scrolls and insets itself, keeps one inset rather than
 * two and its scrollbar stands on the panel's edge.
 */
export const FlushBodyForAThread: Story = { render: () => <Demo shape="column" thread /> };

/** Every shape from one control. */
export const Shapes: Story = {
  render: function Render() {
    const [shape, setShape] = useState<SidePanelShape>('column');
    return (
      <div>
        <div style={{ padding: 'var(--spacing-3)' }}>
          <SegmentedControl<SidePanelShape>
            label="Shape"
            semantics="radio"
            value={shape}
            onValueChange={setShape}
            options={[
              { value: 'column', label: 'Column' },
              { value: 'drawer', label: 'Drawer' },
              { value: 'sheet', label: 'Sheet' },
            ]}
          />
        </div>
        <Demo key={shape} shape={shape} />
      </div>
    );
  },
};
