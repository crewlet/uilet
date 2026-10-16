/**
 * Type a value back to confirm: a labelled field like every other, whose
 * phrase keeps its own case inside the label's capitals.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { ConfirmField, confirmMatches } from './index.js';

afterEach(cleanup);

function Harness({ phrase = 'jane.founder' }: { phrase?: string }) {
  const [typed, setTyped] = useState('');
  return (
    <>
      <ConfirmField phrase={phrase} value={typed} onValueChange={setTyped} />
      <button type="button" disabled={!confirmMatches(typed, phrase)}>
        Remove
      </button>
    </>
  );
}

describe('ConfirmField', () => {
  test('is a text box named by its label, with the phrase in it', () => {
    render(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Type jane.founder to confirm' });
    expect(box.getAttribute('spellcheck')).toBe('false');
    expect(box.getAttribute('autocomplete')).toBe('off');
    expect(screen.getByText('jane.founder').tagName).toBe('CODE');
  });

  test('confirms only once the phrase is typed exactly', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const remove = screen.getByRole('button', { name: 'Remove' });
    const box = screen.getByRole('textbox');
    expect(remove).toHaveProperty('disabled', true);
    await user.type(box, 'JANE.FOUNDER');
    expect(remove).toHaveProperty('disabled', true);
    await user.clear(box);
    await user.type(box, ' jane.founder ');
    expect(remove).toHaveProperty('disabled', false);
  });

  test('an empty phrase never confirms', () => {
    expect(confirmMatches('', '')).toBe(false);
    expect(confirmMatches('a', 'a')).toBe(true);
    expect(confirmMatches('a', 'A')).toBe(false);
  });

  test('a literal inside a label keeps its case', () => {
    // The label is set in capitals, and a login typed back exactly has to be
    // shown exactly.
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(here, '..', 'Input', 'Input.css'), 'utf8');
    const at = css.indexOf('.crewlet-label code,');
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toContain('.crewlet-label__text code');
    expect(rule).toContain('text-transform: none');
  });

  test('takes a label of its own around the phrase', () => {
    render(
      <ConfirmField
        phrase="acme"
        value=""
        onValueChange={() => {}}
        label={(phrase) => <>Type the company name, {phrase}, to delete it</>}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Type the company name, acme, to delete it' })).toBeTruthy();
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <Harness />
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
