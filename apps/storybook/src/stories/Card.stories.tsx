import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, Tag } from '@crewlethq/ui';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  args: { variant: 'default', padding: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'subtle', 'outlined', 'elevated'] },
    padding: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    interactive: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: 400 }}>
      <Card.Header>
        <Card.Title>Production cluster</Card.Title>
        <Tag variant="success">healthy</Tag>
      </Card.Header>
      <Card.Body>
        <Card.Description>Six worker nodes, last reconciled 2 minutes ago.</Card.Description>
      </Card.Body>
      <Card.Footer>
        <Button variant="tertiary" size="small">Edit</Button>
        <Button variant="primary" size="small">Open</Button>
      </Card.Footer>
    </Card>
  ),
};

/*
 * Reuse Basic.render across variant stories. The non-null assertion
 * is safe because Basic.render is defined inline above; the cast
 * keeps tsconfig's exactOptionalPropertyTypes from rejecting the
 * `T | undefined` shape of Story['render'].
 */
const BasicRender = Basic.render!;

export const Elevated: Story = { args: { variant: 'elevated' }, render: BasicRender };
export const Outlined: Story = { args: { variant: 'outlined' }, render: BasicRender };
export const Subtle: Story = { args: { variant: 'subtle' }, render: BasicRender };

export const Interactive: Story = {
  args: { interactive: true },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 320 }} tabIndex={0}>
      <Card.Title>Click me</Card.Title>
      <Card.Description>Hover and focus states are styled via `is-interactive`.</Card.Description>
    </Card>
  ),
};

