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
    // The content's track is its column, never the window: 640px at the most.
    expect(frame.gridTemplateColumns).toBe('240px minmax(0, 640px)');
    expect(frame.gridTemplateAreas.replace(/\s+/g, ' ')).toBe(`'head head' 'rail content' 'rail aside' 'foot foot'`);
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__rail')!).position).toBe('sticky');
    // The room is the page's, not the window's: a container query on its own width.
    expect(/\.crewlet-setup-wizard \{([^}]*)\}/.exec(css)?.[1]).toMatch(/container-type:\s*inline-size;/);
    const wide =
      /@container \(min-width: 70rem\) \{\s*\.crewlet-setup-wizard \.crewlet-setup-wizard__frame \{([^}]*)\}/.exec(css)?.[1] ?? '';
    // Every track has a measure, so the aside stands beside the content however wide the window.
    expect(wide.replace(/\s+/g, ' ')).toMatch(
      /grid-template-columns: var\(--crewlet-setup-wizard-rail\) minmax\(0, var\(--crewlet-setup-wizard-column\)\) var\(--crewlet-setup-wizard-aside\);/,
    );
    expect(wide).not.toMatch(/1fr\)/);
    expect(wide).toMatch(/'rail content aside'/);
  });

  test('with no aside there is no row held for one, so no second gap stands above the footer', () => {
    uninstall = installAtWidth(1024, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard aside={undefined} asideLabel={undefined} />);
    const frame = getComputedStyle(container.querySelector('.crewlet-setup-wizard__frame')!);
    expect(frame.gridTemplateAreas.replace(/\s+/g, ' ')).toBe(`'head head' 'rail content' 'foot foot'`);
    expect(frame.gridTemplateRows).toBe('auto 1fr auto');
    cleanup();
    uninstall();
    uninstall = installAtWidth(390, 'light', 'SetupWizard/SetupWizard.css');
    asPhone();
    const phone = render(<Wizard aside={undefined} asideLabel={undefined} />);
    const narrow = getComputedStyle(phone.container.querySelector('.crewlet-setup-wizard__frame')!);
    expect(narrow.gridTemplateAreas.replace(/\s+/g, ' ')).toBe(`'head' 'rail' 'content' 'foot'`);
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

  test('the footer takes back the shell’s room under the content, so it ends the screen', () => {
    // The shell keeps its end room in one custom property and pads the content with it.
    const shell = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../AppShell/AppShell.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const content = /\.crewlet-app-shell__content \{([^}]*)\}/.exec(shell)?.[1] ?? '';
    expect(content).toMatch(/--crewlet-app-shell-content-end:\s*var\(--spacing-10\);/);
    expect(content).toMatch(/padding-bottom:\s*var\(--crewlet-app-shell-content-end\);/);
    // The footer gives exactly that room back, and nothing outside a shell.
    const footer = /\.crewlet-setup-wizard__footer \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(footer).toMatch(/margin-bottom:\s*calc\(-1 \* var\(--crewlet-app-shell-content-end, 0px\)\);/);
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard />);
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__footer')!).marginBottom).toMatch(/^(0px|calc\(-1 \* 0px\))$/);
  });
});

describe('the footer holds still between steps', () => {
  test('the wizard fills its screen, so a short step does not lift the footer', () => {
    uninstall = installAtWidth(1024, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard />);
    const wizard = getComputedStyle(container.querySelector('.crewlet-setup-wizard')!);
    expect(wizard.display).toBe('flex');
    expect(wizard.flexDirection).toBe('column');
    expect(wizard.flexGrow).toBe('1');
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__frame')!).flexGrow).toBe('1');
  });

  test('on a phone the content’s row takes a short step’s slack, not the footer’s', () => {
    uninstall = installAtWidth(390, 'light', 'SetupWizard/SetupWizard.css');
    asPhone();
    const { container } = render(<Wizard />);
    expect(getComputedStyle(container.querySelector('.crewlet-setup-wizard__frame')!).gridTemplateRows).toBe(
      'auto auto 1fr auto auto',
    );
    cleanup();
    const bare = render(<Wizard aside={undefined} asideLabel={undefined} />);
    expect(getComputedStyle(bare.container.querySelector('.crewlet-setup-wizard__frame')!).gridTemplateRows).toBe('auto auto 1fr auto');
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

  test('on a phone the actions share two rows, the primary the whole width on the last', () => {
    uninstall = installAtWidth(390, 'light', 'SetupWizard/SetupWizard.css');
    asPhone();
    const { container } = render(
      <Wizard
        actions={undefined}
        footerStart={<button type="button">Exit</button>}
        footer={
          <>
            <button type="button">Back</button>
            <button type="button">Save as draft</button>
            <button type="button">Adopt</button>
          </>
        }
      />,
    );
    const footer = container.querySelector('.crewlet-setup-wizard__footer')!;
    expect(getComputedStyle(footer).flexWrap).toBe('wrap');
    for (const group of footer.children) expect(getComputedStyle(group).display).toBe('contents');
    const [back, save, adopt] = [...footer.querySelectorAll('.crewlet-setup-wizard__footer-end > button')];
    expect(getComputedStyle(back!).marginInlineStart).toBe('auto');
    expect(getComputedStyle(save!).flex).not.toMatch(/100%/);
    expect(getComputedStyle(adopt!).flexBasis).toBe('100%');
    // Wide, each group keeps its own row of buttons.
    cleanup();
    uninstall();
    vi.restoreAllMocks();
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const wide = render(<Wizard actions={undefined} footerStart={<button type="button">Exit</button>} />);
    const end = wide.container.querySelector('.crewlet-setup-wizard__footer-end')!;
    expect(getComputedStyle(end).display).toBe('flex');
  });

  test('without footerStart the actions still stand at the end', () => {
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard />);
    const footer = container.querySelector('.crewlet-setup-wizard__footer')!;
    expect(footer.children).toHaveLength(1);
    expect(getComputedStyle(footer.firstElementChild!).marginInlineStart).toBe('auto');
  });

  test('a wide step takes the content’s and the aside’s columns together, and no aside holds no column', () => {
    uninstall = installAtWidth(1440, 'light', 'SetupWizard/SetupWizard.css');
    const { container } = render(<Wizard wide aside={undefined} asideLabel={undefined} />);
    const root = container.querySelector('.crewlet-setup-wizard')!;
    expect(root.classList.contains('crewlet-setup-wizard--wide')).toBe(true);
    expect(root.classList.contains('crewlet-setup-wizard--no-aside')).toBe(true);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SetupWizard.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    // The wide measure is the column, the gap and the aside: its footer ends where every step's does.
    const own = /\.crewlet-setup-wizard \{([^}]*)\}/.exec(css)?.[1]?.replace(/\s+/g, ' ') ?? '';
    expect(own).toMatch(
      /--crewlet-setup-wizard-wide: calc\( var\(--crewlet-setup-wizard-column\) \+ var\(--crewlet-setup-wizard-gap\) \+ var\(--crewlet-setup-wizard-aside\) \);/,
    );
    const inQuery = /@container \(min-width: 70rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const noAside = /\.crewlet-setup-wizard--no-aside \.crewlet-setup-wizard__frame \{([^}]*)\}/.exec(inQuery)?.[1] ?? '';
    expect(noAside).toMatch(/grid-template-columns:\s*var\(--crewlet-setup-wizard-rail\) minmax\(0, var\(--crewlet-setup-wizard-column\)\);/);
    expect(noAside).not.toMatch(/aside/);
    const wideNoAside =
      /\.crewlet-setup-wizard--wide\.crewlet-setup-wizard--no-aside \.crewlet-setup-wizard__frame \{([^}]*)\}/.exec(inQuery)?.[1] ?? '';
    expect(wideNoAside).toMatch(/grid-template-columns:\s*var\(--crewlet-setup-wizard-rail\) minmax\(0, var\(--crewlet-setup-wizard-wide\)\);/);
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
