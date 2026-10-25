import type { Meta, StoryObj } from '@storybook/react-vite';
import { InboxGlyph } from '@crewlethq/icons/glyphs';
import { Button, IconButton, IndicatorAnchor, Inline, StatusDot, VisuallyHidden } from '@crewlethq/ui';

/**
 * A mark with a small indicator at its top end corner: the notification
 * badge's convention. The dot is ringed in the control's own fill, so it parts
 * from the glyph it overlaps, and the control's name says why it is there.
 */
const meta: Meta<typeof IndicatorAnchor> = {
  title: 'UI/IndicatorAnchor',
  component: IndicatorAnchor,
};

export default meta;
type Story = StoryObj<typeof IndicatorAnchor>;

/** On a secondary pill: the leading glyph wears the dot, the label stays clear of it. */
export const OnAButton: Story = {
  render: () => (
    <Inline gap={3} align="center">
      <Button
        variant="secondary"
        shape="pill"
        leadingIcon={
          <IndicatorAnchor indicator={<StatusDot tone="warning" />}>
            <InboxGlyph size="sm" />
          </IndicatorAnchor>
        }
      >
        Inbox
        <VisuallyHidden>, a change waits on your approval</VisuallyHidden>
      </Button>
      <Button
        variant="secondary"
        shape="pill"
        leadingIcon={
          <IndicatorAnchor indicator={<StatusDot tone="info" pulse />}>
            <InboxGlyph size="sm" />
          </IndicatorAnchor>
        }
      >
        Inbox
        <VisuallyHidden>, an answer is on its way</VisuallyHidden>
      </Button>
    </Inline>
  ),
};

/** On an icon-only square, the name carries the reason. */
export const OnAnIconButton: Story = {
  render: () => (
    <IconButton
      variant="secondary"
      label="Inbox, a change waits on your approval"
      icon={
        <IndicatorAnchor indicator={<StatusDot tone="warning" />}>
          <InboxGlyph size="sm" />
        </IndicatorAnchor>
      }
    />
  ),
};
