import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@crewlethq/ui';
import { Icon } from '@crewlethq/icons';
import { SaveGlyph } from '@crewlethq/icons/glyphs';

/**
 * The button, and the hierarchy its variants are.
 *
 * `primary` is the one action on the screen and takes the accent fill;
 * `accent` is the same recipe under the name a call site may already spell.
 * `secondary` is everything else, `tertiary` is for a dense toolbar,
 * `outline` is the branded yes on a page that already has a primary, and
 * `danger` is a secondary that has gone red: it holds the neutral weight
 * until it is pointed at, because it sits beside Cancel and it is the one
 * button nobody should press by reflex.
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Open documentation',
    variant: 'primary',
    size: 'medium',
    shape: 'square',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'outline', 'tertiary', 'accent', 'danger'],
    },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    shape: { control: 'inline-radio', options: ['square', 'pill'] },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Outline: Story = { args: { variant: 'outline' } };

export const Tertiary: Story = { args: { variant: 'tertiary', children: 'Cancel' } };

export const Accent: Story = { args: { variant: 'accent', children: 'Continue' } };

/**
 * Destructive. It states itself in the critical INK and takes the hue on
 * hover, so the row it is in does not pull the eye to the answer that
 * deletes.
 */
export const Danger: Story = { args: { variant: 'danger', children: 'Delete forever' } };

/**
 * THE WHOLE REGISTER AT ONCE, which is what a review of the look actually
 * needs: every variant in one row over every size, so the hierarchy is read
 * as a hierarchy rather than one button at a time. Switch the theme and the
 * density in the toolbar above; every height here is a control step and every
 * pad a scale step, so nothing in the row can drift.
 */
export const Register: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(['small', 'medium', 'large'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['primary', 'secondary', 'outline', 'tertiary', 'accent', 'danger'] as const).map((variant) => (
            <Button key={variant} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
          <Button variant="secondary" size={size} disabled>
            disabled
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Pill: Story = { args: { shape: 'pill', children: 'Get started' } };

export const Disabled: Story = { args: { disabled: true } };

/**
 * The button is waiting on something. The spinner takes the leading
 * icon's place so the label neither moves nor changes width, and the
 * button disables itself so the action cannot be fired twice.
 */
export const Loading: Story = { args: { loading: true, children: 'Checking' } };

/** A loading button keeps its leading icon's slot rather than both. */
export const LoadingWithLeadingIcon: Story = {
  args: {
    loading: true,
    children: 'Saving',
    leadingIcon: <SaveGlyph />,
  },
};

export const Small: Story = { args: { size: 'small' } };

export const Large: Story = { args: { size: 'large' } };

export const WithLeadingIcon: Story = {
  args: {
    leadingIcon: <Icon name="CrewletIcon" />,
    children: 'Read the docs',
  },
};

export const AsChildAnchor: Story = {
  render: () => (
    <Button asChild variant="outline" size="small">
      <a href="https://example.com" target="_blank" rel="noreferrer">
        Open external docs
      </a>
    </Button>
  ),
};
