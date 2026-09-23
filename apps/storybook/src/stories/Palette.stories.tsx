import type { Meta, StoryObj } from '@storybook/react-vite';
import { flatten, runPalette, tightest } from '@crewlethq/tokens/test/palette';
// The built stylesheets as TEXT, which is what the suite measures. Vite's
// `?raw` gives the same bytes a browser would have parsed.
import tokensCss from '@crewlethq/tokens/css?raw';
import themesCss from '@crewlethq/tokens/css/themes?raw';
import { fitPalettes, MOVED_DE, type FitPalette } from '../paletteFit';

/**
 * Foundations / Palette.
 *
 * The measured ratio of every pair, generated from the suite's OWN rule table
 * rather than from a list kept beside it. What is printed here is what
 * `packages/tokens/test/palette.test.mjs` asserts, in the same four states a
 * browser can end up in: the marketing root alone, the dark root, light by
 * media query and light by attribute.
 *
 * The point of rendering it is that a later edit shows what it costs. A hue
 * moved to fix one pair is a hue that may have closed the gap on another, and
 * the cross-family floors in particular are floors rather than targets: the
 * three-vision minimum of every one of them is in this table, so nobody has to
 * take the hue budget on trust.
 *
 * `TheFit` is the other half: every colour the approved design declares
 * (`packages/tokens/tokens/intent.json`), what ships for it, how far it moved,
 * and what fails when that value alone goes back to the design.
 */
const { checks, failures } = runPalette({ tokens: tokensCss, themes: themesCss });

const meta: Meta = {
  title: 'Foundations/Palette',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const cell: React.CSSProperties = {
  padding: 'var(--spacing-2) var(--spacing-3)',
  borderBottom: '1px solid var(--color-border-default)',
  textAlign: 'left',
  verticalAlign: 'top',
};

function Table({ rows }: { rows: typeof checks }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-compact)' }}>
      <thead>
        <tr>
          <th style={{ ...cell, color: 'var(--color-text-tertiary)' }}>Rule</th>
          <th style={{ ...cell, color: 'var(--color-text-tertiary)' }}>Tightest pair</th>
          <th style={{ ...cell, color: 'var(--color-text-tertiary)' }}>State</th>
          <th style={{ ...cell, color: 'var(--color-text-tertiary)' }}>Measured</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((check) => (
          <tr key={`${check.rule}:${check.state}:${check.subject}`}>
            <td style={cell}>{check.rule}</td>
            <td style={{ ...cell, fontFamily: 'var(--font-family-mono)' }}>{check.subject}</td>
            <td style={{ ...cell, color: 'var(--color-text-tertiary)' }}>{check.state}</td>
            <td
              style={{
                ...cell,
                fontFamily: 'var(--font-family-mono)',
                color: check.ok ? 'var(--color-feedback-success-ink)' : 'var(--color-feedback-danger-ink)',
              }}
            >
              {check.detail}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The worst measured value under each rule: the number that would break first. */
export const TightestPerRule: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ marginBottom: 'var(--spacing-2)' }}>The tightest pair under every rule</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-5)' }}>
        {checks.length} checks over four states, {failures.length} failing. Each row is the pair that would break
        first if its hue moved.
      </p>
      <Table rows={tightest(checks).sort((a, b) => a.rule.localeCompare(b.rule))} />
    </div>
  ),
};

/** Everything, for an edit that needs to see what else a hue is near. */
export const EveryCheck: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ marginBottom: 'var(--spacing-5)' }}>Every measured pair</h2>
      <Table rows={checks} />
    </div>
  ),
};

/** A swatch of `value` composited over the palette's frame, so a translucent step reads as it lands. */
function Chip({ value, frame }: { value: string; frame: FitPalette['frame'] }) {
  const { r, g, b } = flatten(value, frame);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          flex: 'none',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--color-border-strong)',
          background: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
        }}
      />
      <code>{value}</code>
    </span>
  );
}

function FitTable({ palette }: { palette: FitPalette }) {
  const moved = palette.rows.filter((row) => row.distance >= MOVED_DE);
  return (
    <section style={{ marginBottom: 'var(--spacing-8)' }}>
      <h3 style={{ marginBottom: 'var(--spacing-2)' }}>{palette.name === 'dark' ? 'Dark' : 'Light'}</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-4)' }}>
        {palette.rows.length} colours declared, {moved.length} moved. Measured in the {palette.state} state; a
        translucent step is shown over this palette&apos;s frame.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-compact)' }}>
        <thead>
          <tr>
            {['Token', 'Design', 'Shipped', 'dE', 'What fails at the design value'].map((heading) => (
              <th key={heading} style={{ ...cell, color: 'var(--color-text-tertiary)' }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {palette.rows.map((row) => (
            <tr key={`${row.label}:${row.token}`}>
              <td style={{ ...cell, fontFamily: 'var(--font-family-mono)' }}>
                {row.token}
                <div style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-sans)' }}>{row.label}</div>
              </td>
              <td style={cell}>
                <Chip value={row.design} frame={palette.frame} />
              </td>
              <td style={cell}>
                <Chip value={row.shipped} frame={palette.frame} />
              </td>
              <td style={{ ...cell, fontFamily: 'var(--font-family-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {row.distance < MOVED_DE ? '0' : row.distance.toFixed(2)}
              </td>
              <td style={cell}>
                {row.distance < MOVED_DE ? (
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Ships as designed</span>
                ) : row.binding.length === 0 ? (
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Nothing: the move is a rule of the kit&apos;s own, named in the token&apos;s comment
                  </span>
                ) : (
                  <ul style={{ margin: 0, paddingInlineStart: 'var(--spacing-4)' }}>
                    {row.binding.map((check) => (
                      <li key={`${check.rule}:${check.subject}`}>
                        {check.rule}:{' '}
                        <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-feedback-danger-ink)' }}>
                          {check.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * The fit: the approved design's palette against what ships. Each moved value
 * lists what fails when it alone goes back to the design, the tightest check
 * under each rule it breaks, measured now rather than recorded.
 */
export const TheFit: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ marginBottom: 'var(--spacing-2)' }}>The approved palette, and what the floors moved</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-6)', maxWidth: '72ch' }}>
        Where a design value fails one of the suite&apos;s floors, the floor wins and the value moves the least it can
        inside its own family. The last column is the suite run again with that one declaration put back, and the
        steps the build derives from it following it.
      </p>
      {fitPalettes({ tokens: tokensCss, themes: themesCss }).map((palette) => (
        <FitTable key={palette.name} palette={palette} />
      ))}
    </div>
  ),
};
