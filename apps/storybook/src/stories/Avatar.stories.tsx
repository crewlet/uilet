import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '@crewlethq/ui';
import samplePortrait from '../fixtures/sample-portrait.svg';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  args: {
    name: 'Carlos Diaz',
    size: 64,
  },
  argTypes: {
    src: { control: 'text' },
    name: { control: 'text' },
    size: { control: { type: 'number', min: 16, max: 160, step: 4 } },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    colorSeed: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 64 },
};

export const InitialsOnly: Story = {
  args: { name: 'Carlos Diaz', size: 64 },
};

export const SingleWordInitials: Story = {
  args: { name: 'Acme', size: 64 },
};

export const Square: Story = {
  args: { src: samplePortrait, name: 'Acme', size: 80, shape: 'square' },
};

export const SquareInitials: Story = {
  args: { name: 'Acme', size: 80, shape: 'square' },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar name="Carlos Diaz" size={32} />
      <Avatar name="Carlos Diaz" size={48} />
      <Avatar name="Carlos Diaz" size={64} />
      <Avatar src={samplePortrait} name="Carlos Diaz" size={96} />
    </div>
  ),
};

export const IdentityTints: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {['support-bot', 'deploy-bot', 'qa-runner', 'triage-bot', 'oncall-bot', 'docs-bot'].map(
        (key) => (
          <div key={key} style={{ textAlign: 'center', fontSize: 12 }}>
            <Avatar name={key} colorSeed={key} size={48} />
            <div style={{ marginTop: 4 }}>{key}</div>
          </div>
        ),
      )}
    </div>
  ),
};

