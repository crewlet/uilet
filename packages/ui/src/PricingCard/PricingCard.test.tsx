/**
 * The plan card's states, and the two rules its stylesheet used to break: a
 * dark-theme literal at every tag, and a pop animation that ran whatever a
 * reader's system asked for.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { PricingCard } from './index.js';

afterEach(cleanup);

const css = () => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'PricingCard.css'), 'utf8');

const plan = (props: Partial<Parameters<typeof PricingCard>[0]> = {}) => (
  <PricingCard {...props}>
    <PricingCard.Header>
      <PricingCard.Name>Team</PricingCard.Name>
      <PricingCard.Tag variant="save">Save 10 percent</PricingCard.Tag>
    </PricingCard.Header>
    <PricingCard.Price>
      <PricingCard.Amount>$49</PricingCard.Amount>
      <PricingCard.Cadence>per month</PricingCard.Cadence>
    </PricingCard.Price>
  </PricingCard>
);

describe('PricingCard', () => {
  test('a chosen plan is a pressed control, not just a tinted one', () => {
    render(plan({ selected: true }));
    expect(screen.getByRole('button', { pressed: true })).toBeTruthy();
  });

  test('an unavailable plan stays reachable and says why it cannot be chosen', () => {
    const onClick = vi.fn();
    render(plan({ unavailable: true, onClick }));
    const card = screen.getByRole('button');
    // aria-disabled rather than disabled: the reason a plan cannot be chosen
    // is unreachable by exactly the reader who needs it if the card takes no
    // focus.
    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.hasAttribute('disabled')).toBe(false);
    fireEvent.click(card);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('a display card is not a control at all', () => {
    render(plan({ interactive: false }));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Team')).toBeTruthy();
  });

  test('every colour comes from a token, in both palettes', () => {
    // The tags, the price note and the card's own ground were dark-theme
    // literals: an amber at rgba(251, 191, 36, 0.75) and a green at #86efac,
    // neither of which is visible on a light page.
    const text = css().replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(text).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(text).not.toMatch(/\brgba?\s*\(/);
  });

  test('a pricing tag is a Tag, not a second pill that has to agree with one', () => {
    // It had its own radius, its own type and its own tint table here, so a
    // "Save 10 percent" chip and a success tag two screens away were the same
    // claim drawn two ways. What is left in this file is the only thing this
    // card has to say about a tag: where the top one sits, and the line the
    // price note gets to itself.
    render(plan());
    const tag = screen.getByText('Save 10 percent').closest('.crewlet-pricing-card__tag');
    expect(tag?.className).toContain('crewlet-tag');
    expect(tag?.className).toContain('crewlet-tag--success');

    const text = css().replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const property of ['background', 'border-radius', 'font-size', 'font-weight']) {
      expect(text).not.toMatch(new RegExp(`\\.crewlet-pricing-card__(tag|price-note)[^{]*\\{[^}]*${property}:`));
    }
  });

  test('a note that leads with a glyph keeps the gap between it and its words', () => {
    // The pill spaces its own slots, and a caller's glyph is not one of them:
    // everything passed as children lands in ONE slot, the label, so the gap
    // the pill spends between a dot and a word never reaches inside it. That
    // is proved on the DOM here and then held in the stylesheet, because a
    // note whose icon touches its "Save" is what the card drew before it had
    // a rule of its own.
    render(
      <PricingCard>
        <PricingCard.Price>
          <PricingCard.PriceNote>
            <span data-testid="note-glyph" aria-hidden />
            Save 10 percent
          </PricingCard.PriceNote>
        </PricingCard.Price>
      </PricingCard>,
    );
    const label = screen.getByTestId('note-glyph').closest('.crewlet-tag__label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('Save 10 percent');

    const text = css().replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(text).toMatch(
      /\.crewlet-pricing-card__price-note \.crewlet-tag__label\s*\{[^}]*gap:\s*var\(--spacing-1\)/,
    );
    // Layout only. The pill, the tint and the type stay the Tag's.
    const rule = /\.crewlet-pricing-card__price-note \.crewlet-tag__label\s*\{([^}]*)\}/.exec(text)?.[1] ?? '';
    for (const property of ['background', 'border-radius', 'font-size', 'font-weight', 'color']) {
      expect(rule).not.toContain(`${property}:`);
    }
  });

  test('the pop animations stop under reduced motion', () => {
    const at = css().indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThan(-1);
    const reduced = css().slice(at);
    expect(reduced).toContain('crewlet-pricing-card__amount--discounted');
    expect(reduced).toContain('crewlet-pricing-card__price-note');
    expect(reduced).toContain('animation: none');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Plans</h1>
        <PricingCard.Grid>
          {plan()}
          {plan({ selected: true })}
        </PricingCard.Grid>
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
