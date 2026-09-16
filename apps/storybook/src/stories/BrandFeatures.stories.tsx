import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { CodeSandbox, CompanyAsCode, Hierarchy, HumanInLoop, Knowledge, TurnEngine } from '@crewlethq/icons';

/*
 * The six feature illustrations, as a set.
 *
 * They are only ever seen together, in a README table, a marketing band or a
 * docs landing page, so they are judged together: one canvas, one disc, one
 * ramp, and six drawings that read as six capabilities rather than six
 * palettes. A mark drawn without the brief looks perfectly fine alone and
 * wrong here, which is the whole reason this page exists.
 *
 * It is also where the 0.2.0 bug was visible and nowhere else. Every gradient
 * in the set was measured in objectBoundingBox, the SVG default, under which a
 * shape with a zero-area bounding box is not rendered at all: the two arrows
 * in human-in-loop and the three config lines in company-as-code were simply
 * absent, in a file that was valid and a build that was clean.
 */

const FEATURES = [
  ['Hierarchy', Hierarchy, 'The org chart is the execution graph'],
  ['CompanyAsCode', CompanyAsCode, 'The company as versioned configuration'],
  ['TurnEngine', TurnEngine, 'The executor and reviewer loop'],
  ['CodeSandbox', CodeSandbox, 'Sandboxed code authoring'],
  ['Knowledge', Knowledge, 'Shared knowledge and what a seat remembers'],
  ['HumanInLoop', HumanInLoop, 'Human seats in the org chart'],
] as const;

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

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 'var(--spacing-4)',
};

const cell: CSSProperties = { display: 'grid', gap: 'var(--spacing-2)', justifyItems: 'center', textAlign: 'center' };

/** One block rendered twice, once per theme, so the pair can be compared. */
const BothThemes = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
    {(['light', 'dark'] as const).map((theme) => (
      <div key={theme} data-theme={theme} style={panel}>
        <p style={heading}>{theme === 'light' ? 'Light' : 'Dark'}</p>
        {children}
      </div>
    ))}
  </div>
);

const meta: Meta = {
  title: 'Brand/Feature illustrations',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Six 80x80 marks drawn to one brief: a #111 disc, a two-stop cut of the brand ramp, and a gradient spanning the canvas in user space. The brief is held by packages/icons/test/features.test.mjs.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * The set at its native size. The disc is what lets each one read on a light
 * page as well as a dark one, so both themes here should look the same: that
 * sameness is the property, not a missed opportunity to theme them.
 */
export const All: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={grid}>
          {FEATURES.map(([name, Drawing, meaning]) => (
            <div key={name} style={cell}>
              <Drawing style={{ fontSize: 80 }} />
              <code style={caption}>{name}</code>
              <p style={{ ...note, fontSize: 'var(--font-size-xs)' }}>{meaning}</p>
            </div>
          ))}
        </div>
      </BothThemes>
    </div>
  ),
};

/**
 * Every size the set is drawn at, from a hero band down to a chip beside a
 * heading. The detail inside each mark is what decides how far down it holds,
 * which is a thing to look at rather than a rule to write.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        {([80, 48, 32, 24] as const).map((size) => (
          <div key={size} style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
            <p style={caption}>{size}px</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center', flexWrap: 'wrap' }}>
              {FEATURES.map(([name, Drawing]) => (
                <Drawing key={name} style={{ fontSize: size }} />
              ))}
            </div>
          </div>
        ))}
      </BothThemes>
    </div>
  ),
};

/**
 * The shapes the gradient rule protects, magnified. Every stroke here runs
 * along one axis, which gives it a bounding box with no area, and each one
 * disappears entirely the moment its gradient is left at the SVG default.
 */
export const AxisAlignedStrokes: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-5)' }}>
      <BothThemes>
        <div style={{ display: 'flex', gap: 'var(--spacing-5)', flexWrap: 'wrap' }}>
          {([
            ['HumanInLoop', HumanInLoop, 'two connection arrows'],
            ['CompanyAsCode', CompanyAsCode, 'three config lines'],
            ['Knowledge', Knowledge, 'three captured lessons'],
            ['CodeSandbox', CodeSandbox, 'the title bar and the prompt'],
          ] as const).map(([name, Drawing, what]) => (
            <div key={name} style={cell}>
              <Drawing style={{ fontSize: 160 }} />
              <code style={caption}>{name}</code>
              <p style={{ ...note, fontSize: 'var(--font-size-xs)' }}>{what}</p>
            </div>
          ))}
        </div>
        <p style={note}>
          A gradient with no `gradientUnits` is measured from the box of each shape that paints with it, and a shape
          with no width or no height is then not rendered. These ten strokes are why every gradient in `svg/` declares
          `userSpaceOnUse` and spans the 80x80 canvas.
        </p>
      </BothThemes>
    </div>
  ),
};
