import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@crewlethq/ui';
import { Icon } from '@crewlethq/icons';

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

export const Danger: Story = { args: { variant: 'danger', children: 'Delete forever' } };

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
    leadingIcon: <span className="material-symbols-outlined">save</span>,
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
