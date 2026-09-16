import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, LayerHost, Menu, Popover, useModalLayer, type MenuEntry } from '@crewlethq/ui';

/**
 * UI / Layer.
 *
 * The keyboard contract is asserted in the jsdom suites, not here: uilet's CI
 * runs release check, install, build, lint, typecheck and test, and no job
 * executes a play function. This page is for looking at what the stack does.
 */
const meta: Meta = {
  title: 'UI/Layer',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

/** A modal shell on the stack, so the page can raise real surfaces over it. */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const modal = useModalLayer({ onClose });
  return (
    <div
      ref={modal.veilRef}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: modal.zIndex,
        background: 'var(--color-surface-scrim)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        ref={modal.panelRef}
        role="dialog"
        aria-modal
        aria-label={title}
        tabIndex={-1}
        style={{
          width: 'min(420px, 90vw)',
          padding: 'var(--spacing-5)',
          display: 'grid',
          gap: 'var(--spacing-4)',
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <h2 style={{ fontSize: 'var(--font-size-md)' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const actions: MenuEntry[] = [
  { key: 'edit', label: 'Edit', onSelect: () => {} },
  { key: 'move', label: 'Move to', onSelect: () => {} },
  { kind: 'separator', key: 'sep' },
  { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
];

/**
 * A dialog over a sheet, a menu inside the dialog, and a prompt raised over
 * the open menu.
 *
 * Escape closes exactly one of them, topmost first, and each surface's z-index
 * is its DEPTH in the stack rather than a counter that only grows, so the
 * fourth surface of a session still paints below a toast.
 */
export const StackedSurfaces: Story = {
  render: function StackedSurfacesStory() {
    const [sheet, setSheet] = useState(false);
    const [dialog, setDialog] = useState(false);
    const [prompt, setPrompt] = useState(false);
    return (
      <div style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-4)', justifyItems: 'start' }}>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 'var(--size-measure)' }}>
          Open each in turn, then press Escape repeatedly. One press closes one surface.
        </p>
        <Button onClick={() => setSheet(true)}>Open the sheet</Button>
        {sheet && (
          <Sheet title="Edit unit" onClose={() => setSheet(false)}>
            <Menu label="Actions for Engineering" items={actions} trigger="Actions" />
            <Button variant="secondary" onClick={() => setDialog(true)}>
              Ask something
            </Button>
          </Sheet>
        )}
        {dialog && (
          <Sheet title="Discard changes?" onClose={() => setDialog(false)}>
            <Button variant="secondary" onClick={() => setPrompt(true)}>
              And one more
            </Button>
          </Sheet>
        )}
        {prompt && (
          <Sheet title="Are you certain?" onClose={() => setPrompt(false)}>
            <Button variant="danger" onClick={() => setPrompt(false)}>
              Discard
            </Button>
          </Sheet>
        )}
      </div>
    );
  },
};

/**
 * A LayerHost, which is what a fullscreen container needs.
 *
 * A fullscreen element renders only its own subtree, so a menu portalled to
 * `document.body` while a canvas is fullscreen is not painted at all. The host
 * is also what a panel is placed against: its rectangle is the bounds, so a
 * menu opened near the edge slides back inside the CONTAINER rather than the
 * window.
 */
export const InsideALayerHost: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <div
        style={{
          position: 'relative',
          height: 320,
          padding: 'var(--spacing-4)',
          overflow: 'hidden',
          background: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <LayerHost>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Menu label="Actions for the first card" items={actions} trigger="Near the start" />
            <Popover
              label="Filter"
              trigger={(open, toggle) => (
                <Button variant="secondary" onClick={toggle} aria-expanded={open}>
                  Near the edge
                </Button>
              )}
            >
              <div style={{ padding: 'var(--spacing-3)', minWidth: 220 }}>
                Slid back inside the container, not the window.
              </div>
            </Popover>
          </div>
        </LayerHost>
      </div>
    </div>
  ),
};
