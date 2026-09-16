import type { Meta, StoryObj } from '@storybook/react-vite';
import { runPalette, tightest } from '@crewlethq/tokens/test/palette';
// The built stylesheets as TEXT, which is what the suite measures. Vite's
// `?raw` gives the same bytes a browser would have parsed.
import tokensCss from '@crewlethq/tokens/css?raw';
import themesCss from '@crewlethq/tokens/css/themes?raw';

/**
 * Foundations / Palette.
 *
 * The measured ratio of every pair, generated from the suite's OWN rule table
 * rather than from a list kept beside it. What is printed here is what
 * `packages/tokens/test/palette.test.mjs` asserts, in the same four states a
 * browser can end up in: the marketing root alone, light, dark by media query
 * and dark by attribute.
 *
 * The point of rendering it is that a later edit shows what it costs. A hue
 * moved to fix one pair is a hue that may have closed the gap on another, and
 * the cross-family floors in particular are floors rather than targets: the
 * three-vision minimum of every one of them is in this table, so nobody has to
 * take the hue budget on trust.
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
