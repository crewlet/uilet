import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ColorField, ContrastBadge } from '@crewlethq/ui';

const meta: Meta<typeof ColorField> = {
  title: 'UI/ColorField',
  component: ColorField,
};

export default meta;
type Story = StoryObj<typeof ColorField>;

/** A brand's roles, as the engine stores them: lowercase `#rrggbb`. Story data, not tokens. */
const BRAND = {
  primary: '#5b3df5',
  text: '#16131f',
  lightGround: '#fbfaff',
} as const;

/**
 * THE COLOURS CARD EDITING: a field per role. Type a value or pick one in the
 * swatch; a value that is not `#` and six hex digits is refused when you leave
 * the field, and the role keeps its last colour. The contrast row measures the
 * draft as it changes.
 */
export const Editing: Story = {
  render: function Render() {
    const [primary, setPrimary] = useState<string>(BRAND.primary);
    const [text, setText] = useState<string>(BRAND.text);
    const [ground, setGround] = useState<string>(BRAND.lightGround);
    const [dark, setDark] = useState('');
    return (
      <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <ColorField label="Primary" helper="Links, buttons and accents" required value={primary} onChange={setPrimary} />
          <ColorField label="Text" helper="Body text" required value={text} onChange={setText} />
          <ColorField label="Light ground" helper="Pages and slides" optional value={ground} onChange={setGround} />
          <ColorField label="Dark ground" helper="Covers and dark slides" optional value={dark} onChange={setDark} />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <ContrastBadge label="Text on light ground" foreground={text} background={ground} />
          <ContrastBadge label="White on primary" foreground="#ffffff" background={primary} />
          <ContrastBadge label="Primary on light ground" foreground={primary} background={ground} scale="large" />
          <ContrastBadge label="Light ground on dark ground" foreground={ground} background={dark} />
        </div>
      </div>
    );
  },
};

/** A field the engine refused, with its own sentence, and a disabled one. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 320 }}>
      <ColorField label="Text" value="#8a8a8a" onChange={() => {}} error="Text on the light ground reads at 3.45:1. Adoption needs 4.5:1." />
      <ColorField label="Primary" value={BRAND.primary} onChange={() => {}} disabled />
    </div>
  ),
};

/**
 * WHAT IT READS. The `#` is drawn in the field, so a person types the six
 * digits alone. Paste or type `#00baba`, `00baba`, `#0bb` or
 * `rgb(0, 186, 186)` (commas or spaces) and leave the field: each is stored
 * as lowercase `#rrggbb` and shown as its six digits. Anything else is
 * refused with one sentence.
 */
export const AcceptedForms: Story = {
  render: function Render() {
    const [value, setValue] = useState('');
    return (
      <div style={{ display: 'grid', gap: 8, width: 320 }}>
        <ColorField label="Primary" helper="Try rgb(0, 186, 186) or #0bb" optional value={value} onChange={setValue} />
        <output style={{ fontFamily: 'var(--font-family-mono)' }}>{value || 'Nothing stored'}</output>
      </div>
    );
  },
};
