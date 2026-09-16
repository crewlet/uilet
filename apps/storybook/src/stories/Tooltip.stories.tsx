import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, IconButton, LayerHost, Tooltip } from '@crewlethq/ui';
import { HelpGlyph, ScheduleGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / Tooltip.
 *
 * A tooltip is a hint about a control that already has a name. It is not
 * reachable by touch, it is read only once the control is focused, and it is
 * gone as soon as the pointer moves, so nothing a reader must have goes in one.
 */
const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Basic: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-4)', padding: 'var(--spacing-10)' }}>
      <Tooltip content="Runs at 09:00 in Europe/Berlin">
        <Button variant="secondary" leadingIcon={<ScheduleGlyph size="sm" />}>
          Schedule
        </Button>
      </Tooltip>
      <Tooltip content="Below the control instead" placement="bottom">
        <Button variant="secondary">Below</Button>
      </Tooltip>
    </div>
  ),
};

/**
 * The line is long enough to want reading at leisure, so the pointer may travel
 * from the control onto the panel and the panel stays. That is WCAG 2.2's
 * 1.4.13, and it is the half a hand-rolled tooltip always drops.
 */
export const Hoverable: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-10)' }}>
      <Tooltip content="The window is the last full hour the store can answer for, which is why an hour that has not finished is not offered.">
        <IconButton label="What this means" icon={<HelpGlyph size="md" />} />
      </Tooltip>
    </div>
  ),
};

/**
 * A tooltip on a control that is unavailable, which is the case a native
 * `disabled` cannot serve: a disabled button receives no pointer events and
 * takes no focus, so the explanation for why it is unavailable cannot be
 * reached by anybody. Both controls here are soft-disabled instead, which is
 * what every unavailable control in this package is.
 */
export const OnADisabledControl: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-4)', padding: 'var(--spacing-10)' }}>
      <Tooltip content="Nothing has changed since the last save.">
        <Button variant="primary" disabledReason="Nothing has changed since the last save.">
          Review and save
        </Button>
      </Tooltip>
      <Tooltip content="A machine user holds one key at a time.">
        <IconButton label="Add a key" icon={<ScheduleGlyph size="md" />} disabledReason="A machine user holds one key at a time." />
      </Tooltip>
    </div>
  ),
};

/**
 * Inside a LayerHost, which is what a container that can go fullscreen needs: a
 * fullscreen element paints only its own subtree, so a panel portalled to the
 * body is not drawn at all.
 */
export const InsideALayerHost: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <div
        style={{
          position: 'relative',
          height: 220,
          padding: 'var(--spacing-6)',
          overflow: 'hidden',
          background: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <LayerHost>
          <Tooltip content="Placed against the container, not the window.">
            <Button variant="secondary">Near the edge</Button>
          </Tooltip>
        </LayerHost>
      </div>
    </div>
  ),
};
