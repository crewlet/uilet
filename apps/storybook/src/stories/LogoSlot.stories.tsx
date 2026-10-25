import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ButtonLink, LogoSlot, LogoSlotGroup } from '@crewlethq/ui';
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

/**
 * THREE SLOTS ALIGNED ROW BY ROW: `LogoSlotGroup` makes each slot a subgrid
 * of one set of rows, so the names, the descriptions (however many lines
 * each runs to), the stages, the notes under them and the action rows each
 * start on one line across the three. What may be brought is written once
 * under the row and describes every picker.
 */
export const AlignedGroup: Story = {
  render: function Render() {
    return (
      <div style={{ maxWidth: 880 }}>
        <LogoSlotGroup label="Logos" hint="SVG up to 512 KB. PNG or WebP up to 2 MB and 4096 px.">
          <LogoSlot editable label="Primary logo" description="On light grounds: doc headers, light slides and pages." ground="light" src={wordmark} alt="Crewlet logo" onFile={() => {}} onRemove={() => {}} />
          <LogoSlot editable label="For dark grounds" description="Dark slides and dark mode. Recommended." ground="dark" groundColor="#120a2b" alt="Crewlet logo on dark" onFile={() => {}} />
          <LogoSlot
            editable
            label="Mark"
            description="Square: chips, slide corners and the brand chip. Recommended."
            ground="light"
            shape="square"
            alt="Crewlet mark"
            onFile={() => {}}
            error="The file is 3 MB. PNG and WebP files can be up to 2 MB."
          />
        </LogoSlotGroup>
      </div>
    );
  },
};

/**
 * SMALL, A THUMBNAIL: `size="sm"` draws the slot at half the stage's height
 * with a tighter inset and smaller words, for a summary of what is set (a
 * brand's review), read-only.
 */
export const Small: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 160px))', gap: 12 }}>
      <LogoSlot size="sm" label="Primary" ground="light" src={wordmark} alt="Crewlet logo" />
      <LogoSlot size="sm" label="For dark grounds" ground="dark" groundColor="#120a2b" src={wordmark} alt="Crewlet logo on dark" />
      <LogoSlot size="sm" label="Mark" ground="light" shape="square" alt="Crewlet mark" emptyNote="Not set" />
    </div>
  ),
};

/**
 * IN A SETUP STEP'S COLUMN: three slots in one row at 503px, the width the
 * brand setup's content column has at 1440, with no note under any of them,
 * so the action rows sit a step under the stages rather than two gaps.
 */
export const InAFormColumn: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 40 }}>
      {[480, 503, 640].map((width) => (
        <div key={width} style={{ width }}>
          <LogoSlotGroup label={`Logos at ${width}px`} hint="SVG up to 512 KB. PNG or WebP up to 2 MB and 4096 px.">
            <LogoSlot editable label="Primary logo" description="Doc headers, light slides and pages." ground="light" src={wordmark} alt="Crewlet logo" onFile={() => {}} onRemove={() => {}} />
            <LogoSlot editable label="For dark grounds" description="Dark slides and dark mode." ground="dark" groundColor="#120a2b" alt="Crewlet logo on dark" onFile={() => {}} />
            <LogoSlot editable label="Mark" description="Chips, slide corners and the brand chip." ground="light" shape="square" alt="Crewlet mark" onFile={() => {}} />
          </LogoSlotGroup>
        </div>
      ))}
    </div>
  ),
};
