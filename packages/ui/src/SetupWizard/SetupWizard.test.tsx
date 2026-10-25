/**
 * SetupWizard: the landmarks and headings a reader moves by, focus following
 * the step, and the three shapes (side by side, the aside under the content,
 * one column on a phone).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { installAtWidth } from '../../../../apps/ui-tests/src/cascade.js';
import type { StepperStep } from '../Stepper/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import { SetupWizard, type SetupWizardProps } from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  vi.restoreAllMocks();
  cleanup();
});

const STEPS: StepperStep[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'logos', label: 'Logos' },
  { id: 'colours', label: 'Colours', status: 'attention' },
  { id: 'typography', label: 'Typography', status: 'optional' },
  { id: 'voice', label: 'Voice', status: 'optional' },
  { id: 'review', label: 'Review' },
];

function Wizard(props: Partial<SetupWizardProps>) {
  return (
    <SetupWizard
      title="Set up your brand"
      trail={<span>Company › Brand › Set up</span>}
      status={<span role="status">Draft saved 2 min ago</span>}
      actions={<button type="button">Exit</button>}
      steps={STEPS}
      current="colours"
      onSelect={() => {}}
      stepsLabel="Setup steps"
      heading="Colours"
      lead="Agents use these colours in every artifact they make."
      aside={<p>Doc preview</p>}
      asideLabel="Preview of your draft"
      footer={
        <>
          <button type="button">Back</button>
          <button type="button">Continue</button>
        </>
      }
      {...props}
    >
      <label>
        Primary <input defaultValue="#00baba" />
      </label>
    </SetupWizard>
  );
}

/** Answers the phone query as a phone would, for the hook that reads it. */
function asPhone() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('640px'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe('what a reader moves by', () => {
  test('a navigation landmark holds the steps as a column of buttons', () => {
    render(<Wizard />);
    const nav = screen.getByRole('navigation', { name: 'Setup steps' });
    const list = within(nav).getByRole('list', { name: 'Setup steps' });
    expect(list.classList.contains('crewlet-stepper--vertical')).toBe(true);
    expect(within(nav).getAllByRole('button')).toHaveLength(3);
    expect(within(nav).getByRole('button', { name: /Colours/ }).getAttribute('aria-current')).toBe('step');
  });

  test('the content is a region named by the step’s heading, with the lead under it', () => {
    render(<Wizard />);
    const region = screen.getByRole('region', { name: 'Colours' });
    expect(within(region).getByRole('heading', { name: 'Colours' }).tagName).toBe('H3');
    expect(region.textContent).toContain('Agents use these colours in every artifact they make.');
    expect(within(region).getByRole('textbox', { name: 'Primary' })).toBeTruthy();
  });

  test('the title follows the surrounding level, and the step’s heading is one under it', () => {
    render(
      <HeadingLevelProvider level={1}>
        <Wizard />
      </HeadingLevelProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Set up your brand' }).tagName).toBe('H1');
    expect(screen.getByRole('heading', { name: 'Colours' }).tagName).toBe('H2');
  });

  test('the header carries the trail, the draft’s status and the way out', () => {
    const { container } = render(<Wizard />);
    const head = container.querySelector('.crewlet-setup-wizard__head')!;
    expect(head.textContent).toContain('Company › Brand › Set up');
    expect(within(head as HTMLElement).getByRole('status').textContent).toBe('Draft saved 2 min ago');
    expect(within(head as HTMLElement).getByRole('button', { name: 'Exit' })).toBeTruthy();
  });

  test('the aside is a complementary landmark named by its label, and an aside without one is refused', () => {
    render(<Wizard />);
    expect(screen.getByRole('complementary', { name: 'Preview of your draft' }).textContent).toBe('Doc preview');
    cleanup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Wizard asideLabel={undefined} />)).toThrow(/needs an asideLabel/);
    cleanup();
    render(<Wizard aside={undefined} asideLabel={undefined} />);
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  test('the parts come in reading order: header, steps, content, aside, actions', () => {
    const { container } = render(<Wizard />);
    const frame = container.querySelector('.crewlet-setup-wizard__frame')!;
    expect([...frame.children].map((child) => child.className)).toEqual([
      'crewlet-setup-wizard__head',
      'crewlet-setup-wizard__rail',
      'crewlet-setup-wizard__content',
      'crewlet-setup-wizard__aside',
      'crewlet-setup-wizard__footer',
    ]);
  });
});

describe('focus follows the step', () => {
  test('the first render takes no focus, and a new step moves it to the step’s heading', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Wizard />);
    expect(document.activeElement).toBe(document.body);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    rerender(<Wizard current="typography" heading="Typography" />);
    const heading = screen.getByRole('heading', { name: 'Typography' });
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
    // The same step again moves nothing.
    screen.getByRole('button', { name: 'Back' }).focus();
    rerender(<Wizard current="typography" heading="Typography" lead="Changed" />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back' }));
  });
});

describe('on a phone', () => {
  test('the steps are a row under a line saying where the reader is, and the aside folds into a disclosure', async () => {
    asPhone();
    const user = userEvent.setup();
    const { container } = render(<Wizard />);
    const nav = screen.getByRole('navigation', { name: 'Setup steps' });
    expect(nav.querySelector('.crewlet-setup-wizard__position')!.textContent).toBe('Step 3 of 6 · Colours');
    expect(within(nav).getByRole('list').classList.contains('crewlet-stepper--vertical')).toBe(false);
    const toggle = screen.getByRole('button', { name: 'Preview' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.crewlet-setup-wizard__preview')).not.toBeNull();
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('complementary', { name: 'Preview of your draft' }).textContent).toBe('Doc preview');
  });

  test('the line and the toggle are the caller’s words', () => {
    asPhone();
    render(<Wizard labels={{ progress: (at, total) => `Schritt ${at} von ${total}`, asideToggle: 'Vorschau' }} />);
    expect(screen.getByText(/Schritt 3 von 6/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vorschau' })).toBeTruthy();
  });
});

describe('the three shapes', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SetupWizard.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  test('the rail beside the content with the aside under it, then all three side by side from 70rem of its own width', () => {
    uninstall = installAtWidth(1024, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard />);
    const frame = getComputedStyle(container.querySelector('.crewlet-setup-wizard__frame')!);
    expect(frame.gridTemplateColumns).toBe('240px minmax(0, 1fr)');
    expect(frame.gridTemplateAreas.replace(/\s+/g, ' ')).toBe(`'head head' 'rail content' 'rail aside' 'foot foot'`);
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__rail')!).position).toBe('sticky');
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__content')!).maxWidth).toBe('640px');
    // The room is the page's, not the window's: a container query on its own width.
    expect(/\.crewlet-setup-wizard \{([^}]*)\}/.exec(css)?.[1]).toMatch(/container-type:\s*inline-size;/);
    const wide = /@container \(min-width: 70rem\) \{\s*\.crewlet-setup-wizard__frame \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(wide).toMatch(/grid-template-columns:\s*240px minmax\(0, 1fr\) 320px;/);
    expect(wide).toMatch(/'rail content aside'/);
  });

  test('one column on a phone, the rail scrolling with the page', () => {
    uninstall = installAtWidth(390, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard />);
    const frame = getComputedStyle(container.querySelector('.crewlet-setup-wizard__frame')!);
    expect(frame.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__rail')!).position).toBe('static');
  });

  test('the footer holds at the bottom of the view, above the safe area, at every width', () => {
    for (const width of [390, 1024, 1440]) {
      uninstall?.();
      uninstall = installAtWidth(width, 'light', 'SetupWizard/SetupWizard.css');
      cleanup();
      const { container } = render(<Wizard />);
      const footer = getComputedStyle(container.querySelector('.crewlet-setup-wizard__footer')!);
      expect(footer.position, String(width)).toBe('sticky');
      expect(footer.bottom, String(width)).toBe('0px');
    }
    expect(/\.crewlet-setup-wizard__footer \{([^}]*)\}/.exec(css)?.[1]).toMatch(/env\(safe-area-inset-bottom/);
  });
});

describe('the footer and a wide step', () => {
  test('the way out stands at the start of the footer row and the step’s actions at its end', () => {
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard actions={undefined} footerStart={<button type="button">Exit</button>} />);
    const footer = container.querySelector('.crewlet-setup-wizard__footer')!;
    const [start, end] = [...footer.children];
    expect(start!.className).toBe('crewlet-setup-wizard__footer-start');
    expect(start!.textContent).toBe('Exit');
    expect(end!.className).toBe('crewlet-setup-wizard__footer-end');
    expect(end!.textContent).toBe('BackContinue');
    expect(getComputedStyle(end!).marginInlineStart).toBe('auto');
    // Tab order follows: Exit, then Back and Continue.
    expect([...footer.querySelectorAll('button')].map((button) => button.textContent)).toEqual(['Exit', 'Back', 'Continue']);
  });

  test('without footerStart the actions still stand at the end', () => {
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard />);
    const footer = container.querySelector('.crewlet-setup-wizard__footer')!;
    expect(footer.children).toHaveLength(1);
    expect(getComputedStyle(footer.firstElementChild!).marginInlineStart).toBe('auto');
  });

  test('a wide step takes the whole width beside the rail, and no aside holds no column', () => {
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard wide aside={undefined} asideLabel={undefined} />);
    const root = container.querySelector('.crewlet-setup-wizard')!;
    expect(root.classList.contains('crewlet-setup-wizard--wide')).toBe(true);
    expect(root.classList.contains('crewlet-setup-wizard--no-aside')).toBe(true);
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__content')!).maxWidth).toBe('none');
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SetupWizard.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const wideNoAside =
      /@container \(min-width: 70rem\) \{[\s\S]*?\.crewlet-setup-wizard--no-aside \.crewlet-setup-wizard__frame \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(wideNoAside).toMatch(/grid-template-columns:\s*240px minmax\(0, 1fr\);/);
    expect(wideNoAside).not.toMatch(/aside/);
  });
});

test('carries no axe violation, wide and on a phone', async () => {
  for (const phone of [false, true]) {
    cleanup();
    vi.restoreAllMocks();
    if (phone) asPhone();
    const { container } = render(
      <main>
        <Wizard />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id), phone ? 'phone' : 'wide').toEqual([]);
  }
});
