import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ColorSwatch, LogoSlot, ReviewList, TypeSpecimen } from '@crewlethq/ui';
import { BlendGlyph, BuildingComplexGlyph, ImageGlyph, PencilGlyph, TextQuoteGlyph, TypeGlyph } from '@crewlethq/icons/glyphs';
import wordmark from '@crewlethq/icons/svg/crewlet-icon.svg';

const meta: Meta<typeof ReviewList> = {
  title: 'UI/ReviewList',
  component: ReviewList,
};

export default meta;
type Story = StoryObj<typeof ReviewList>;

const edit = (part: string) => (
  <Button size="small" variant="ghost" leadingIcon={<PencilGlyph size="sm" />} aria-label={`Edit ${part}`}>
    Edit
  </Button>
);

/*
 * As many logos to a row as fit at a width their labels stand on one line at:
 * three across a phone's row cut "For dark grounds" onto a second line, which
 * pushed its tile 20px below the two beside it.
 */
const THUMBS = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(9rem, 100%), 1fr))', gap: 12, maxWidth: 480 } as const;
const SWATCHES = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: 12 } as const;

function BrandSummary({ error }: { error?: string }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <ReviewList label="Brand summary">
        <ReviewList.Item
          icon={<BuildingComplexGlyph size="sm" />}
          title="Identity"
          status={{ label: 'Complete', tone: 'success' }}
          action={edit('Identity')}
        >
          <strong>FairSplit</strong>
          <div style={{ color: 'var(--color-text-secondary)' }}>Split bills without the awkward part.</div>
        </ReviewList.Item>
        <ReviewList.Item
          icon={<ImageGlyph size="sm" />}
          title="Logos"
          status={error ? { label: 'Missing required', tone: 'danger' } : { label: 'Complete', tone: 'success' }}
          action={edit('Logos')}
          error={error}
        >
          <div style={THUMBS}>
            <LogoSlot label="Primary" ground="light" src={error ? undefined : wordmark} alt="FairSplit logo" />
            <LogoSlot label="For dark grounds" ground="dark" alt="FairSplit logo on dark grounds" />
            <LogoSlot label="Mark" ground="light" shape="square" alt="FairSplit mark" />
          </div>
        </ReviewList.Item>
        <ReviewList.Item
          icon={<BlendGlyph size="sm" />}
          title="Colours"
          status={{ label: 'Needs attention', tone: 'warning' }}
          action={edit('Colours')}
        >
          <div style={SWATCHES}>
            <ColorSwatch name="Primary" value="#00baba" size="sm" copyable={false} />
            <ColorSwatch name="Text" value="#1a1d24" size="sm" copyable={false} />
          </div>
        </ReviewList.Item>
        <ReviewList.Item
          icon={<TypeGlyph size="sm" />}
          title="Typography"
          status={{ label: 'Uses defaults', tone: 'neutral' }}
          action={edit('Typography')}
        >
          <div style={SWATCHES}>
            <TypeSpecimen label="Headings" family="Geist" fontFamily="var(--font-family-sans)" sample="" weight="semibold" size="sm" />
            <TypeSpecimen label="Body" family="Geist" fontFamily="var(--font-family-sans)" sample="" size="sm" />
          </div>
        </ReviewList.Item>
        <ReviewList.Item
          icon={<TextQuoteGlyph size="sm" />}
          title="Voice"
          status={{ label: 'Complete', tone: 'success' }}
          action={edit('Voice')}
        >
          Plain, warm and exact. We say what happened, then what to do.
        </ReviewList.Item>
      </ReviewList>
    </div>
  );
}

/**
 * A SETUP'S REVIEW: one box, one row a part. Each row carries the part's
 * glyph, its name as a heading, its state as a pill and an Edit that names the
 * part, and SHOWS the values the part holds under the name. Rows share the
 * box's hairline, so a tall row of logos never leaves holes beside a one-line
 * name the way a grid of cards does.
 */
export const BrandSetupReview: Story = {
  render: () => <BrandSummary />,
};

/**
 * WHAT HOLDS THE FINISH is said under the part it is about, in the danger ink
 * with its glyph, as an alert: shown once a finish was tried, never as an
 * orphan line at the bottom of the page.
 */
export const MissingRequired: Story = {
  render: () => <BrandSummary error="Add the primary logo to adopt." />,
};

/** UNDER 28REM OF ITS OWN WIDTH, as on a phone, the values take the whole row. */
export const Narrow: Story = {
  render: () => (
    <div style={{ maxWidth: 358 }}>
      <BrandSummary />
    </div>
  ),
};
