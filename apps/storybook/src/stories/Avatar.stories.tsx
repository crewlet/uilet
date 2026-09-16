import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '@crewlethq/ui';
import samplePortrait from '../fixtures/sample-portrait.svg';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  args: {
    name: 'Carlos Diaz',
    size: 'md',
    shape: 'square',
    tone: 'neutral',
    variant: 'solid',
  },
  argTypes: {
    src: { control: 'text' },
    name: { control: 'text' },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    tone: { control: 'inline-radio', options: ['neutral', 'brand', 'seeded'] },
    variant: { control: 'inline-radio', options: ['solid', 'dashed'] },
    decorative: { control: 'boolean' },
    colorSeed: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 'lg' },
};

export const InitialsOnly: Story = {};

/**
 * Half the names this draws are handles, so the initials split on hyphen,
 * underscore and dot as well as on whitespace: `backend-engineer` is BE, not
 * a column of Bs.
 */
export const Handles: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {['Carlos Diaz', 'backend-engineer', 'sre_lead', 'carlos.diaz', 'Acme'].map((name) => (
        <div key={name} style={{ textAlign: 'center', fontSize: 12 }}>
          <Avatar name={name} size="lg" />
          <div style={{ marginTop: 4 }}>{name}</div>
        </div>
      ))}
    </div>
  ),
};

/**
 * The corner moves with the box: 4px at 20, 8px at 26 and 32, 12px at 40. One
 * radius across four boxes reads as a pill at the smallest and as a plain box
 * at the largest. A numeric size takes the middle step, because nothing in the
 * scale can answer for an arbitrary box.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar name="Carlos Diaz" size="xs" />
      <Avatar name="Carlos Diaz" size="sm" />
      <Avatar name="Carlos Diaz" size="md" />
      <Avatar name="Carlos Diaz" size="lg" />
      <Avatar src={samplePortrait} name="Carlos Diaz" size={96} />
    </div>
  ),
};

/**
 * THE ROUNDED SQUARE IS THE DEFAULT, which is the engine's identity mark and
 * what a reader sees in every seat chip, every list row and every header. The
 * circle stays for a PERSON in a member list, where the round badge is the
 * platform convention that surface already speaks.
 */
export const Shapes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar name="Carlos Diaz" size="lg" />
      <Avatar src={samplePortrait} name="Acme" size="lg" />
      <Avatar name="Carlos Diaz" size="lg" shape="circle" />
      <Avatar src={samplePortrait} name="Carlos Diaz" size="lg" shape="circle" />
    </div>
  ),
};

/**
 * NEUTRAL BY DEFAULT. A hash of a name carries no information: rename the seat
 * and its colour changes, which is the proof it never meant anything. Identity
 * is the monogram and the name beside it.
 */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar name="Carlos Diaz" size="lg" tone="neutral" />
      <Avatar name="Carlos Diaz" size="lg" tone="brand" />
      <Avatar name="Carlos Diaz" size="lg" tone="seeded" colorSeed="ceo" />
    </div>
  ),
};

/**
 * A human seat is DRAWN, not tinted: the engine does not run it, which is a
 * structural fact rather than a status.
 */
export const HumanSeat: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar name="Software Engineer" size="lg" />
      <Avatar name="Ada Byron" size="lg" variant="dashed" />
    </div>
  ),
};

/** The one case a stable per-identity tint earns its place: a roster somebody scans. */
export const IdentityTints: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {['support-bot', 'deploy-bot', 'qa-runner', 'triage-bot', 'oncall-bot', 'docs-bot'].map((key) => (
        <div key={key} style={{ textAlign: 'center', fontSize: 12 }}>
          <Avatar name={key} tone="seeded" colorSeed={key} size="lg" />
          <div style={{ marginTop: 4 }}>{key}</div>
        </div>
      ))}
    </div>
  ),
};
