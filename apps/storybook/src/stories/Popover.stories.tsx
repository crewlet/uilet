import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, Button, Inline, LayerHost, Textarea } from '@crewlethq/ui';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
};

export default meta;
type Story = StoryObj<typeof Popover>;

/**
 * A panel its own content closes hands focus back to the trigger, as Escape
 * does: the Close button goes with the panel, and focus left on it would fall
 * to the page's body.
 */
export const Basic: Story = {
  render: () => (
    <Popover
      label="Details"
      trigger={(open, toggle) => (
        <Button variant="outline" onClick={toggle}>
          {open ? 'Close menu' : 'Open menu'}
        </Button>
      )}
    >
      {(close) => (
        <div style={{ padding: 'var(--spacing-3)' }}>
          <p style={{ margin: '0 0 var(--spacing-2)' }}>Popover content.</p>
          <Button size="small" onClick={close}>Close</Button>
        </div>
      )}
    </Popover>
  ),
};

/** Drawn the frame it is placed (`entrance="instant"`), for a panel a reader opens over and over, as in a conversation. */
export const InstantEntrance: Story = {
  render: () => (
    <Popover
      label="Details"
      entrance="instant"
      trigger={(open, toggle) => (
        <Button variant="outline" onClick={toggle}>
          {open ? 'Close menu' : 'Open menu'}
        </Button>
      )}
    >
      {(close) => (
        <div style={{ padding: 'var(--spacing-3)' }}>
          <p style={{ margin: '0 0 var(--spacing-2)' }}>Popover content.</p>
          <Button size="small" onClick={close}>Close</Button>
        </div>
      )}
    </Popover>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Popover
        label="Actions"
        align="end"
        trigger={(_open, toggle) => (
          <Button variant="outline" onClick={toggle}>Actions</Button>
        )}
      >
        <Inline gap={2} style={{ padding: 'var(--spacing-3)' }}>
          <Button size="small" variant="ghost">Edit</Button>
          <Button size="small" variant="danger">Delete</Button>
        </Inline>
      </Popover>
    </div>
  ),
};

/**
 * A form in a short layer (`height="layer"`): as tall as it needs where the
 * layer has room, and never past the layer's edge. Opened from the foot of
 * the box it opens above, and scrolls rather than be cut off.
 */
export const FormHeldToItsLayer: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        height: 320,
        border: '1px dashed var(--color-border-default)',
        overflow: 'hidden',
      }}
    >
      <LayerHost>
        <div style={{ position: 'absolute', left: 16, bottom: 16 }}>
          <Popover
            label="New comment"
            height="layer"
            trigger={(open, toggle) => (
              <Button variant="outline" onClick={toggle}>
                {open ? 'Close' : 'Comment'}
              </Button>
            )}
          >
            {(close) => (
              <div style={{ display: 'grid', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)' }}>
                <p style={{ margin: 0 }}>A point on the page</p>
                <div style={{ height: 120, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-inset)' }} />
                <Textarea aria-label="Comment" rows={4} />
                <Inline gap={2} justify="end">
                  <Button size="small" variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                  <Button size="small" onClick={close}>
                    Comment
                  </Button>
                </Inline>
              </div>
            )}
          </Popover>
        </div>
      </LayerHost>
    </div>
  ),
};

/**
 * Beside its anchor (`side="right"`), level with it: a tall panel opened from
 * the middle of a frame stands off what it was opened from instead of
 * covering it, and flips left near the right edge.
 */
export const BesideItsAnchor: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        height: 420,
        border: '1px dashed var(--color-border-default)',
        overflow: 'hidden',
      }}
    >
      <LayerHost>
        <div style={{ position: 'absolute', left: 120, top: 180 }}>
          <Popover
            label="New comment"
            side="right"
            height="layer"
            trigger={(open, toggle) => (
              <Button variant="outline" onClick={toggle}>
                {open ? 'Close' : 'Comment'}
              </Button>
            )}
          >
            <div style={{ display: 'grid', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)' }}>
              <p style={{ margin: 0 }}>A point on the page</p>
              <div style={{ height: 160, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-inset)' }} />
              <Textarea aria-label="Comment" rows={4} />
            </div>
          </Popover>
        </div>
      </LayerHost>
    </div>
  ),
};
