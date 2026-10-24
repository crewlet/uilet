import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ButtonLink, LogoSlot } from '@crewlethq/ui';
import { ArrowDownToLineGlyph } from '@crewlethq/icons/glyphs';
import mark from '@crewlethq/icons/favicon/crewlet.svg';
import wordmark from '@crewlethq/icons/svg/crewlet-icon.svg';

const meta: Meta<typeof LogoSlot> = {
  title: 'UI/LogoSlot',
  component: LogoSlot,
};

export default meta;
type Story = StoryObj<typeof LogoSlot>;

/** A reader's download beside a slot's name: the logo's own file, under the name it is offered as. */
function Download({ href, filename }: { href: string; filename: string }) {
  return (
    <ButtonLink href={href} download={filename} size="small" variant="ghost" leadingIcon={<ArrowDownToLineGlyph size="sm" />}>
      Download
    </ButtonLink>
  );
}

const ROW = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, maxWidth: 1000 } as const;

/**
 * COMPANY › BRAND, AS A READER SEES IT: the three logos, each on the ground it
 * is made for whatever the page's own mode, with the space it keeps drawn
 * round it and a download beside its name. The dark slot here is the
 * brand's own dark ground.
 */
export const Reader: Story = {
  render: () => (
    <div style={ROW}>
      <LogoSlot
        label="Primary"
        description="On a light ground"
        ground="light"
        src={wordmark}
        alt="Crewlet logo"
        download={<Download href={wordmark} filename="crewlet-logo.svg" />}
      />
      <LogoSlot
        label="For dark grounds"
        description="On the brand's dark ground"
        ground="dark"
        groundColor="#120a2b"
        src={wordmark}
        alt="Crewlet logo"
        download={<Download href={wordmark} filename="crewlet-logo-on-dark.svg" />}
      />
      <LogoSlot label="Mark" description="Square, for small places" ground="light" shape="square" src={mark} alt="Crewlet mark" download={<Download href={mark} filename="crewlet-mark.svg" />} />
    </div>
  ),
};

/** An empty slot for a reader: where the logo would go, and a sentence saying what that means here. */
export const Empty: Story = {
  render: () => (
    <div style={ROW}>
      <LogoSlot label="Primary" description="On a light ground" ground="light" alt="Crewlet logo" />
      <LogoSlot
        label="For dark grounds"
        description="On a dark ground"
        ground="dark"
        alt="Crewlet logo"
        emptyNote="The primary logo is drawn on a light plate until one is added."
      />
      <LogoSlot label="Mark" description="Square, for small places" ground="light" shape="square" alt="Crewlet mark" />
    </div>
  ),
};

/**
 * AN ADMINISTRATOR EDITING: a picker under each slot (and a file dropped on
 * the slot does the same), Replace and Remove once a logo is there. Choosing a
 * file here shows it after a short upload, as the page does once the engine
 * has checked it.
 */
export const Editing: Story = {
  render: function Render() {
    const [src, setSrc] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    useEffect(() => () => {
      if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
    }, [src]);
    return (
      <div style={ROW}>
        <LogoSlot
          label="Primary"
          description="On a light ground"
          ground="light"
          src={src}
          alt="Company logo"
          editable
          uploading={uploading}
          onFile={(file) => {
            setUploading(true);
            window.setTimeout(() => {
              setSrc(URL.createObjectURL(file));
              setUploading(false);
            }, 900);
          }}
          onRemove={() => setSrc(null)}
        />
        <LogoSlot label="For dark grounds" description="On a dark ground" ground="dark" src={wordmark} alt="Crewlet logo" editable onFile={() => {}} onRemove={() => {}} />
        <LogoSlot label="Mark" description="Square, for small places" ground="light" shape="square" alt="Crewlet mark" editable onFile={() => {}} />
      </div>
    );
  },
};

/** Uploading (the picker spins and the slot takes no other file) and refused (the engine's sentence, announced). */
export const States: Story = {
  render: () => (
    <div style={ROW}>
      <LogoSlot label="Primary" description="On a light ground" ground="light" src={wordmark} alt="Crewlet logo" editable uploading onFile={() => {}} onRemove={() => {}} />
      <LogoSlot
        label="For dark grounds"
        description="On a dark ground"
        ground="dark"
        alt="Crewlet logo"
        editable
        onFile={() => {}}
        error="This SVG declares a DOCTYPE on line 2. Export it again without one."
      />
      <LogoSlot label="Mark" description="Without the guide" ground="light" shape="square" src={mark} alt="Crewlet mark" guide={false} />
    </div>
  ),
};
