import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ImageUpload } from '@crewlethq/ui';
import samplePortrait from '../fixtures/sample-portrait.svg';

const noop = () => undefined;

const meta: Meta<typeof ImageUpload> = {
  title: 'UI/ImageUpload',
  component: ImageUpload,
  args: {
    name: 'Carlos Diaz',
    size: 80,
    shape: 'square',
    onSelect: noop,
    onRemove: noop,
  },
  argTypes: {
    src: { control: 'text' },
    name: { control: 'text' },
    size: { control: { type: 'number', min: 32, max: 160, step: 4 } },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    readOnly: { control: 'boolean' },
    uploading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ImageUpload>;

/*
 * Nothing uploaded yet: the Upload overlay stays on without a hover, AT FULL
 * STRENGTH. It used to rest at 0.85 so a hover still had something to answer
 * with, but `opacity` fades the scrim and the word on it together and the
 * composite measured 3.47:1 on a light page. There is nothing for a hover to
 * answer when the affordance is already up.
 */
export const IdleEmpty: Story = {
  args: { name: 'Carlos Diaz', size: 80, onSelect: noop },
};

export const IdleWithImage: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 80, onSelect: noop, onRemove: noop },
};

export const Uploading: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 80, uploading: true, onSelect: noop, onRemove: noop },
};

export const ReadOnly: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 80, readOnly: true, onSelect: noop },
};

/* A round badge, for the one case that is a PERSON rather than a company. */
export const CircleEmpty: Story = {
  args: { name: 'Carlos Diaz', size: 80, shape: 'circle', onSelect: noop },
};

export const CircleWithImage: Story = {
  args: { src: samplePortrait, name: 'Carlos Diaz', size: 80, shape: 'circle', onSelect: noop, onRemove: noop },
};

/**
 * A working example: selecting a file reads it into a local object URL and
 * briefly shows the uploading state, mirroring how a consumer wires the
 * control to a network upload.
 */
export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [src, setSrc] = useState<string | undefined>(undefined);
      const [uploading, setUploading] = useState(false);

      const handleSelect = (file: File) => {
        setUploading(true);
        const url = URL.createObjectURL(file);
        // Simulate a short network round trip without a timer dependency.
        requestAnimationFrame(() => {
          // Release the previous object URL before replacing it so the demo
          // does not leak blobs across repeated selections.
          setSrc((previous) => {
            if (previous) {
              URL.revokeObjectURL(previous);
            }
            return url;
          });
          setUploading(false);
        });
      };

      const handleRemove = () => {
        setSrc((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return undefined;
        });
      };

      return (
        <ImageUpload
          src={src}
          name="Carlos Diaz"
          size={96}
          uploading={uploading}
          onSelect={handleSelect}
          onRemove={handleRemove}
        />
      );
    }
    return <Demo />;
  },
};
