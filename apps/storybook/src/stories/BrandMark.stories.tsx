import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { CrewletIcon } from '@crewlethq/icons';
import adminFavicon from '@crewlethq/icons/favicon/crewlet-admin.svg';
import favicon from '@crewlethq/icons/favicon/crewlet.svg';
import rasterFavicon from '@crewlethq/icons/favicon/crewlet.ico';

/*
 * The Crewlet mark, and the icon-slot files cut from it.
 *
 * Four products each kept their own copy of this drawing, which is why it is
 * here: the engine embeds it, the console copies it twice, the marketing site
 * frames it square, and the docs site copies it out of this package at build
 * time. What a reader has to be able to see is which file belongs in which
 * slot, because the two answers look identical in a file listing and only one
 * of them looks right in a browser tab.
 *
 * The mark is 3:2. An icon slot is square. Everything on this page follows
 * from those two facts.
 */

const panel: CSSProperties = {
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  padding: 'var(--spacing-5)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
  display: 'grid',
  gap: 'var(--spacing-5)',
};

const heading: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  margin: 0,
};

const caption: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--font-size-xs)',
  fontFamily: 'var(--font-family-mono)',
  margin: 0,
};

const note: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-compact)',
  lineHeight: 'var(--font-line-height-normal)',
  maxWidth: 'var(--size-measure-narrow)',
  margin: 0,
};

const row: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-5)', flexWrap: 'wrap' };

const stack: CSSProperties = { display: 'grid', gap: 'var(--spacing-2)', justifyItems: 'center' };

/** One block rendered twice, once per theme, so the pair can be compared. */
const BothThemes = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
    {(['light', 'dark'] as const).map((theme) => (
      <div key={theme} data-theme={theme} style={panel}>
        <p style={heading}>{theme === 'light' ? 'Light' : 'Dark'}</p>
        {children}
      </div>
    ))}
  </div>
);

/*
 * A square slot with a hairline, drawn at the size a browser actually asks
 * for. The border is the point: it is what makes the air above and below a
 * letterboxed wide mark visible, which is invisible on a page with no edge.
 */
const Slot = ({ size, label, children }: { size: number; label: string; children: ReactNode }) => (
  <div style={stack}>
    <div
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        border: '1px dashed var(--color-border-default)',
        borderRadius: 'var(--radius-xs)',
      }}
    >
      {children}
    </div>
    <p style={caption}>{label}</p>
  </div>
);

const meta: Meta = {
  title: 'Brand/Mark',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'One drawing in three files: the wide mark as a component, and the square icon-slot files under favicon/. The Crewlet name and mark are trademarks; see TRADEMARKS.md.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * The mark itself, as a component. It is sized in `em` like every other
 * drawing in the package, so a lockup sets `font-size` and the mark follows
 * its own text.
 */
export const Mark: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={row}>
          {[24, 40, 64, 120].map((size) => (
            <div key={size} style={stack}>
              <CrewletIcon style={{ fontSize: size }} />
              <p style={caption}>{size}px</p>
            </div>
          ))}
        </div>
        <p style={note}>
          The mark keeps its own colour rather than taking `currentColor`, because it is artwork rather than a glyph:
          the group carries the brand violet and every path under it paints from that. A product that needs another ink
          takes a file of its own, as the operator console does below, rather than a prop that would let any surface
          repaint the mark.
        </p>
      </BothThemes>
    </div>
  ),
};

/**
 * What the square framing does, and what it does not. The same mark in the
 * same slot, wide file on the left and icon-slot file on the right: the square
 * one is about 8 percent larger, which is the wide file's own side margins
 * trimmed off and nothing more. Both still sit in a band across the middle,
 * because a 3:2 drawing cannot be framed into filling a square.
 */
export const InAnIconSlot: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={row}>
          {[16, 32, 48].map((size) => (
            <Slot key={`wide-${size}`} size={size} label={`wide ${size}`}>
              <CrewletIcon style={{ fontSize: size }} />
            </Slot>
          ))}
          {[16, 32, 48].map((size) => (
            <Slot key={`square-${size}`} size={size} label={`icon ${size}`}>
              <img src={favicon} alt="" width={size} height={size} />
            </Slot>
          ))}
        </div>
        <p style={note}>
          Both files carry the same three paths. Only the viewBox differs, so the keyline inside the mark stays a real
          transparent gap and neither file needs a plate behind it. The reason to link the square one is that it is a
          square SOURCE: a raster generator takes its padding from the viewBox, and a search engine will not consider a
          favicon candidate that is not square.
        </p>
      </BothThemes>
    </div>
  ),
};

/**
 * The two favicons side by side. The red is not decoration: it is what tells
 * an operator that the tab they are about to act in is the superadmin console
 * and not a tenant's.
 */
export const OperatorConsole: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={row}>
          {[16, 32, 48].map((size) => (
            <Slot key={`tenant-${size}`} size={size} label={`tenant ${size}`}>
              <img src={favicon} alt="" width={size} height={size} />
            </Slot>
          ))}
          {[16, 32, 48].map((size) => (
            <Slot key={`admin-${size}`} size={size} label={`operator ${size}`}>
              <img src={adminFavicon} alt="" width={size} height={size} />
            </Slot>
          ))}
        </div>
        <p style={note}>
          The distinction has to survive 16px and a row of other tabs, which is why it is a hue change across the whole
          mark rather than a badge on the corner of it.
        </p>
      </BothThemes>
    </div>
  ),
};

/**
 * The raster fallback, for a browser or a bookmark that will not take an SVG.
 * It carries 16, 32 and 48px images, so each slot gets a drawing made for it
 * rather than a downscale of one.
 */
export const Raster: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={row}>
          {[16, 32, 48].map((size) => (
            <Slot key={size} size={size} label={`ico ${size}`}>
              <img src={rasterFavicon} alt="" width={size} height={size} />
            </Slot>
          ))}
        </div>
        <p style={note}>
          A browser picks the image nearest the size it wants, so an .ico with one large image in it is a downscale at
          every other step. This one is the engine's own file, byte for byte, because the route that serves it has a
          test pinning its content type.
        </p>
      </BothThemes>
    </div>
  ),
};
