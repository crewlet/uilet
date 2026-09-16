import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas, Menu } from '@crewlethq/ui';

/**
 * UI / Canvas.
 *
 * A bounded viewport over content too wide for a screen. The keyboard contract
 * is asserted in the jsdom suite, not here: no job executes a play function.
 * This page is for driving one by hand.
 *
 * Try it: drag to pan, Ctrl or Command with the wheel to zoom toward the
 * pointer, a plain wheel once the canvas has focus, and `+`, `-`, `0` and the
 * arrows while the viewport itself holds focus. On a touch screen one finger
 * scrolls the page until the canvas is tapped, and two fingers pinch at any
 * time. The percentage between the two steppers says where the zoom stands;
 * press it and type one, Enter to apply and Escape to abandon.
 */
const meta: Meta<typeof Canvas> = {
  title: 'UI/Canvas',
  component: Canvas,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Canvas>;

const CONTENT = { x: 0, y: 0, width: 1400, height: 760 };

const CARDS = [
  { id: 'a', name: 'Chief Executive', x: 560, y: 0 },
  { id: 'b', name: 'Engineering', x: 160, y: 200 },
  { id: 'c', name: 'Sales', x: 960, y: 200 },
  { id: 'd', name: 'Platform', x: 0, y: 400 },
  { id: 'e', name: 'Product', x: 400, y: 400 },
  { id: 'f', name: 'Partnerships', x: 960, y: 400 },
  { id: 'g', name: 'Reliability', x: 0, y: 600 },
  { id: 'h', name: 'Developer Experience', x: 400, y: 600 },
];

/*
 * A card ON the canvas. The canvas paints the page's own ground, so a card
 * takes the panel surface and stands off it; painted the step above the panel
 * the two greys collapsed into one sheet and a chart read as a wall rather
 * than as objects placed on a field.
 */
const CARD: CSSProperties = {
  position: 'absolute',
  width: 240,
  padding: 'var(--spacing-3)',
  background: 'var(--color-surface-subtle)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-xs)',
  fontSize: 'var(--font-size-compact)',
  color: 'var(--color-text-primary)',
};

function Frame({ children }: { children: ReactNode }) {
  return <div style={{ height: '70vh', padding: 'var(--spacing-4)' }}>{children}</div>;
}

function Chart({ trailing }: { trailing?: (id: string, name: string) => ReactNode }) {
  return (
    <>
      {CARDS.map((card) => (
        <div key={card.id} style={{ ...CARD, left: card.x, top: card.y }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>{card.name}</span>
            {trailing?.(card.id, card.name)}
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-2xs)' }}>
            Unit, 4 seats
          </div>
        </div>
      ))}
    </>
  );
}

/** The whole of it: content wider than the frame, fitted on the first layout. */
export const Default: Story = {
  render: () => (
    <Frame>
      <Canvas label="Organization chart" content={CONTENT}>
        <Chart />
      </Canvas>
    </Frame>
  ),
};

/**
 * A note over the viewport.
 *
 * It is drawn in the untransformed overlay, so it neither scales with the zoom
 * nor resizes the viewport as it comes and goes. It turns its own pointer
 * events off, because the overlay layer is inert but hands each child theirs
 * back: without that line a drag begun on the note would be swallowed instead
 * of panning the chart.
 */
export const WithANote: Story = {
  render: () => (
    <Frame>
      <Canvas
        label="Reporting chart"
        content={CONTENT}
        overlay={
          <p
            style={{
              position: 'absolute',
              inset: 'var(--spacing-2) var(--spacing-2) auto',
              margin: 0,
              padding: 'var(--spacing-1) var(--spacing-2)',
              fontSize: 'var(--font-size-2xs)',
              color: 'var(--color-text-tertiary)',
              // Glass, so the chart under a note stays readable through it.
              background: 'var(--color-surface-glass)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              pointerEvents: 'none',
            }}
          >
            These reporting lines are from the last check. Changes made since then appear after the next one.
          </p>
        }
      >
        <Chart />
      </Canvas>
    </Frame>
  ),
};

/**
 * A menu opened from a card inside.
 *
 * The canvas publishes its overlay as a layer host, so the menu portals out of
 * the transform: it is drawn at one to one however far the chart is zoomed
 * out, it is never clipped inside a card, and it follows its card through a
 * pan or a zoom.
 */
export const AMenuOverTheChart: Story = {
  render: () => (
    <Frame>
      <Canvas label="Organization chart" content={CONTENT}>
        <Chart
          trailing={(id, name) => (
            <Menu
              key={id}
              label={`Actions for ${name}`}
              items={[
                { key: 'edit', label: 'Edit', onSelect: () => {} },
                { key: 'move', label: 'Move to', onSelect: () => {} },
                { kind: 'separator', key: 'sep' },
                { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
              ]}
            />
          )}
        />
      </Canvas>
    </Frame>
  ),
};

/**
 * A canvas that never takes one finger.
 *
 * `touch={false}` leaves one finger to the page for good, which is what a
 * chart embedded in a long scrolling article wants. Two fingers still pinch,
 * because two fingers are never a scroll.
 */
export const OneFingerBelongsToThePage: Story = {
  render: () => (
    <Frame>
      <Canvas label="Organization chart" content={CONTENT} touch={false}>
        <Chart />
      </Canvas>
    </Frame>
  ),
};

/** Without the zoom controls, for a chart small enough to read whole. */
export const WithoutControls: Story = {
  render: function WithoutControlsStory() {
    const [ready, setReady] = useState(false);
    return (
      <Frame>
        <Canvas label="Organization chart" content={CONTENT} controls={false} onReady={() => setReady(true)}>
          <Chart />
        </Canvas>
        <p style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>
          {ready ? 'Fitted once, on the first measured layout.' : 'Waiting for the first measured layout.'}
        </p>
      </Frame>
    );
  },
};
