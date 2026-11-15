import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffView, collapseDiff, diffLines } from '@crewlethq/ui';
import { DEFAULT_THEME_ID, themeRegistry } from '@crewlethq/tokens';
import { paletteStates } from '@crewlethq/tokens/test/palette';
import tokensCss from '@crewlethq/tokens/css?raw';
import themesCss from '@crewlethq/tokens/css/themes?raw';
import allCss from '@crewlethq/tokens/css/themes/all?raw';

/**
 * Foundations / Code host: the code host's colours (the tokens README, "Code read in a code
 * host") in every theme and both modes, each panel scoped to its own palette.
 */
const meta: Meta = {
  title: 'Foundations/Code host',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

type Mode = 'dark' | 'light';

/** One theme in one mode as a panel's own custom properties; the family's aliases resolve inside it. */
function scope(id: string, mode: Mode): CSSProperties {
  const states = paletteStates({ tokens: tokensCss, themes: `${themesCss}\n${allCss}`, palette: id === DEFAULT_THEME_ID ? null : id });
  const values = states[mode === 'dark' ? 'dark' : 'light (attribute)'] ?? new Map<string, string>();
  const own = [...values].filter(([name]) => name.startsWith('--color-') || name.startsWith('--shadow-'));
  return { colorScheme: mode, ...Object.fromEntries(own) } as CSSProperties;
}

const mono: CSSProperties = { fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)', lineHeight: '22px' };
const card: CSSProperties = {
  background: 'var(--color-surface-subtle)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};
const line: CSSProperties = { display: 'grid', gridTemplateColumns: '36px 36px 18px minmax(0, 1fr)', whiteSpace: 'pre' };
const number: CSSProperties = { textAlign: 'right', paddingRight: 6, color: 'var(--color-text-tertiary)' };

const k = (text: string) => <span style={{ color: 'var(--color-syntax-keyword)' }}>{text}</span>;
const s = (text: string) => <span style={{ color: 'var(--color-syntax-string)' }}>{text}</span>;
const n = (text: string) => <span style={{ color: 'var(--color-syntax-number)' }}>{text}</span>;
const f = (text: string) => <span style={{ color: 'var(--color-syntax-function)' }}>{text}</span>;
const t = (text: string) => <span style={{ color: 'var(--color-syntax-type)' }}>{text}</span>;
const c = (text: string) => <span style={{ color: 'var(--color-syntax-comment)', fontStyle: 'italic' }}>{text}</span>;
const p = (text: string) => <span style={{ color: 'var(--color-syntax-punctuation)' }}>{text}</span>;

/** A changed word: its ground over the row, in the primary text. */
const word = (kind: 'added' | 'removed', text: string) => (
  <span style={{ background: `var(--color-diff-${kind}-word)`, color: 'var(--color-text-primary)', borderRadius: 2 }}>{text}</span>
);

/** A changed line: its row, its numbers on its gutter in the sign ink, its sign. */
function Changed({ kind, old, now, children }: { kind: 'added' | 'removed'; old?: number; now?: number; children: ReactNode }) {
  const gutter: CSSProperties = { ...number, background: `var(--color-diff-${kind}-gutter)`, color: `var(--color-diff-${kind}-sign)` };
  return (
    <div style={{ ...line, background: `var(--color-diff-${kind}-row)` }}>
      <span style={gutter}>{old ?? ''}</span>
      <span style={gutter}>{now ?? ''}</span>
      <span style={{ color: `var(--color-diff-${kind}-sign)`, textAlign: 'center' }}>{kind === 'added' ? '+' : '-'}</span>
      <span>{children}</span>
    </div>
  );
}

function Diff() {
  return (
    <div style={{ ...card, ...mono }}>
      <div style={{ ...line, background: 'var(--color-diff-hunk-row)' }}>
        <span style={{ gridColumn: '1 / span 2', background: 'var(--color-diff-hunk-gutter)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>⋯</span>
        <span style={{ gridColumn: '3 / span 2', color: 'var(--color-syntax-comment)' }}>@@ -12,6 +12,7 @@ Flush() error</span>
      </div>
      <div style={line}>
        <span style={number}>12</span>
        <span style={number}>12</span>
        <span />
        <span>{c('// Flush sends what is written so far.')}</span>
      </div>
      <Changed kind="removed" old={13}>
        {'  '}{k('if')} s.w {p('==')} {k('nil')} {p('{')} {k('return')} {word('removed', '0')} {p('}')}
      </Changed>
      <Changed kind="added" now={13}>
        {'  '}{k('if')} s.w {p('==')} {k('nil')} {p('{')} {k('return')} {word('added', 'errNoWriter')} {p('}')}
      </Changed>
      <Changed kind="added" now={14}>
        {'  '}s.{f('write')}{p('(')}{s('"page"')}{p(',')} {n('2')}{p(')')} {c('// the head first')}
      </Changed>
      <div style={{ ...line, background: 'var(--color-surface-selected)', boxShadow: 'inset 2px 0 0 var(--color-brand-accent)' }}>
        <span style={number}>14</span>
        <span style={number}>15</span>
        <span style={{ color: 'var(--color-diff-added-sign)', textAlign: 'center' }}>+</span>
        <span>
          {'  '}{k('var')} buf {t('bytes.Buffer')}
        </span>
      </div>
    </div>
  );
}

const sections = collapseDiff(diffLines('limit: 10\nretries: 2\n', 'limit: 20\nretries: 2\n'), 1);

function Pill({ state, label }: { state: 'open' | 'merged' | 'closed' | 'draft'; label: string }) {
  const edge = state === 'draft' ? 'var(--color-change-draft-edge)' : 'transparent';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--color-change-${state}-ink)` }} />
      <span
        style={{
          padding: '1px 8px',
          borderRadius: 999,
          border: `1px solid ${edge}`,
          background: `var(--color-change-${state}-fill)`,
          color: `var(--color-change-${state}-label)`,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </span>
  );
}

const ref = (ground: boolean): CSSProperties => ({
  ...mono,
  padding: '0 6px',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-code-ref-ink)',
  background: ground ? 'var(--color-code-ref-fill)' : 'transparent',
});
const row = (background: string): CSSProperties => ({ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 8px', background, borderRadius: 'var(--radius-sm)' });
const statuses = (
  <>
    <b style={{ color: 'var(--color-file-added-ink)' }}>A</b>
    <b style={{ color: 'var(--color-file-modified-ink)' }}>M</b>
    <b style={{ color: 'var(--color-file-deleted-ink)' }}>D</b>
    <b style={{ color: 'var(--color-file-renamed-ink)' }}>R</b>
  </>
);

function Panel({ id, name, mode }: { id: string; name: string; mode: Mode }) {
  const square = (background: string) => <span style={{ width: 8, height: 8, borderRadius: 1, background }} />;
  return (
    <section
      style={{
        ...scope(id, mode),
        display: 'grid',
        gap: 'var(--spacing-3)',
        padding: 'var(--spacing-4)',
        background: 'var(--color-surface-background)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--font-size-compact)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        {name}, {mode}
      </h2>
      <Diff />
      <DiffView sections={sections} aria-label={`${name} ${mode}: a two-line change`} />
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span style={{ ...mono, marginRight: 6 }}>+3 -1</span>
        {square('var(--color-diff-added-mark)')}
        {square('var(--color-diff-added-mark)')}
        {square('var(--color-diff-added-mark)')}
        {square('var(--color-diff-removed-mark)')}
        {square('var(--color-border-strong)')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Pill state="open" label="Open" />
        <Pill state="merged" label="Merged" />
        <Pill state="closed" label="Closed" />
        <Pill state="draft" label="Draft" />
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={row('transparent')}>
          At rest <span style={ref(true)}>main</span>
        </div>
        <div style={row('var(--color-surface-hover)')}>
          Hovered <span style={ref(true)}>feature/stream-head</span>
        </div>
        <div style={row('var(--color-surface-selected)')}>
          Selected <span style={ref(false)}>release/2.4</span>
        </div>
      </div>
      <div style={{ ...card, ...mono, padding: '0 8px' }}>
        {k('func')} {p('(')}s {p('*')}
        {t('Stream')}
        {p(')')} <mark style={{ background: 'var(--color-code-match)', color: 'var(--color-text-primary)', borderRadius: 2 }}>Flush</mark>
        {p('()')} {t('error')}
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={row('transparent')}>{statuses} on a row</div>
        <div style={row('var(--color-surface-selected)')}>{statuses} on a selected row</div>
      </div>
    </section>
  );
}

export const EveryThemeAndMode: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
      {themeRegistry.flatMap((theme) =>
        (['dark', 'light'] as const).map((mode) => <Panel key={`${theme.id}-${mode}`} id={theme.id} name={theme.name} mode={mode} />),
      )}
    </div>
  ),
};
