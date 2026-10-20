import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import type { ThemeId } from '@crewlethq/tokens';
import { ArtifactKindTile, Card, ChoiceList, Composer, DocumentTitleField, Input, LayersList, ThemeGallery } from '@crewlethq/ui';

/**
 * Foundations / Selection and focus.
 *
 * Two states that used to share one look, now told apart:
 *
 * - A CHOSEN option (a template, a theme, an agent, the slide being edited)
 *   is calm: `--color-border-selected`, the accent mixed toward its ground, at
 *   one pixel, over `--color-surface-selected`, the soft fill, with a mark of
 *   its own that clears 3:1 (a radio, a check, the slide number in the accent
 *   ink), so the state never rests on the tint.
 * - FOCUS is the one accent line on the page: `--color-focus` at 2px on
 *   `:focus-visible`, the area WCAG 2.2's focus appearance asks for. A text
 *   field draws that ring for the keyboard and narrows it to one tinted pixel
 *   where a pointer put the caret, as the page tracks with
 *   `trackFocusModality` (every field starts it). Press Tab into the fields
 *   below, then click into them, to see both.
 */
const meta: Meta = {
  title: 'Foundations/Selection and focus',
};

export default meta;

const Section = ({ title, note, children }: { title: string; note: string; children: ReactNode }) => (
  <section style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 560 }}>
    <div style={{ display: 'grid', gap: 'var(--spacing-1)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-compact)' }}>{note}</p>
    </div>
    {children}
  </section>
);

const BOARDS = [
  { id: 'hero', label: 'Hero' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
];

export const Overview: StoryObj = {
  render: function Render() {
    const [theme, setTheme] = useState<ThemeId>('nightshade');
    const [who, setWho] = useState<string | null>('analyst');
    const [board, setBoard] = useState('features');
    const [start, setStart] = useState<'landing' | 'screens'>('landing');
    const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
    const [title, setTitle] = useState('');
    const [brief, setBrief] = useState('');
    return (
      <div style={{ display: 'grid', gap: 'var(--spacing-8)' }}>
        <Section
          title="A chosen option"
          note="The selected edge over the selected fill, and a mark that clears 3:1. Tab onto a card: the focus ring is the only accent line."
        >
          <ThemeGallery value={theme} onValueChange={setTheme} columns={3} />
          <ChoiceList
            label="Agent"
            value={who}
            onChange={setWho}
            options={[
              { value: 'analyst', label: 'Analyst', detail: 'Data team', tag: 'Suggested' },
              { value: 'designer', label: 'Designer', detail: 'Product' },
            ]}
          />
          <LayersList label="Boards" items={BOARDS} selected={board} onSelect={setBoard} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--spacing-3)' }}>
            {(['landing', 'screens'] as const).map((layout) => (
              <ArtifactKindTile
                key={layout}
                kind="design"
                label={layout === 'landing' ? 'Landing page' : 'App screens'}
                detail={layout === 'landing' ? 'Desktop and phone' : 'Four phone screens'}
                selected={start === layout}
                onSelect={() => setStart(layout)}
              />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--spacing-3)' }}>
            {(['monthly', 'annual'] as const).map((plan) => (
              <Card key={plan} interactive selected={billing === plan} asChild>
                <button type="button" aria-pressed={billing === plan} onClick={() => setBilling(plan)} style={{ textAlign: 'start', font: 'inherit', color: 'inherit' }}>
                  {plan === 'monthly' ? 'Monthly' : 'Annual'}
                </button>
              </Card>
            ))}
          </div>
        </Section>
        <Section
          title="A field in focus"
          note="Two pixels in the focus colour for the keyboard; one pixel of the selected edge, round a box or under a title, where a pointer put the caret."
        >
          <DocumentTitleField aria-label="Title" placeholder="Untitled" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input aria-label="Search" placeholder="Search the boards" />
          <Composer label="Brief" value={brief} onChange={setBrief} onSubmit={() => {}} placeholder="What should it show?" />
        </Section>
      </div>
    );
  },
};
