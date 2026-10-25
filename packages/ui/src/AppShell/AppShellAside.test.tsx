/**
 * The shell's aside and its peek slot: a third track that pushes the page as
 * a column, a modal surface as an overlay or a sheet, the grip in the seam,
 * and a scroller that is never remounted by either.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { SidePanel } from '../SidePanel/index.js';
import {
  AppShell,
  useAppShellAside,
  useAppShellPeek,
  type AppShellAsideShape,
  type AppShellPeekShape,
} from './index.js';

afterEach(cleanup);

function Shell({
  shape,
  onClose = () => {},
  aside = <button type="button">Inside</button>,
  resize,
  peek,
  peekShape,
  children,
}: {
  shape?: AppShellAsideShape;
  onClose?: () => void;
  aside?: ReactNode;
  resize?: { onChange: (width: number) => void; onCommit?: (width: number) => void };
  peek?: ReactNode;
  peekShape?: AppShellPeekShape;
  children?: ReactNode;
}) {
  return (
    <AppShell
      sidebar={<AppShell.Rail header={<a href="#/">Crewlet</a>} />}
      topbar={<AppShell.Topbar title="Work" />}
      aside={shape ? aside : undefined}
      asideShape={shape}
      asideLabel="Crewlet Assistant"
      asideWidth={420}
      asideReserve={760}
      onAsideClose={onClose}
      asideResize={
        resize ? { min: 360, max: 640, defaultValue: 420, label: 'Resize the assistant panel', ...resize } : undefined
      }
      peek={peek}
      peekShape={peekShape}
    >
      {children ?? <button type="button">Page</button>}
    </AppShell>
  );
}

const root = () => document.querySelector<HTMLElement>('.crewlet-app-shell')!;

test('with no aside there is no track, no region and no shape', () => {
  render(<Shell />);
  expect(root().hasAttribute('data-aside')).toBe(false);
  expect(screen.queryByRole('complementary', { name: 'Crewlet Assistant' })).toBeNull();
  expect(root().style.getPropertyValue('--crewlet-app-shell-aside')).toBe('');
});

test('as a column it is a complementary region beside the sheet, with its width and the page floor on the root', () => {
  render(<Shell shape="column" />);
  const region = screen.getByRole('complementary', { name: 'Crewlet Assistant' });
  expect(region.getAttribute('aria-modal')).toBeNull();
  expect(root().getAttribute('data-aside')).toBe('column');
  expect(root().style.getPropertyValue('--crewlet-app-shell-aside')).toBe('420px');
  expect(root().style.getPropertyValue('--crewlet-app-shell-aside-reserve')).toBe('760px');
  // After the sheet in the document, so the reading order is rail, page, aside.
  const sheet = document.querySelector('.crewlet-app-shell__sheet')!;
  expect(sheet.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(document.querySelector('.crewlet-app-shell__aside-veil')).toBeNull();
});

test('as a column the page stays reachable: focus is not trapped and nothing is modal', () => {
  render(<Shell shape="column" />);
  const page = screen.getByRole('button', { name: 'Page' });
  page.focus();
  expect(document.activeElement).toBe(page);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('the grip stands in the seam as a column, sizes by keyboard and keeps the width where the key lands', () => {
  const onChange = vi.fn();
  const onCommit = vi.fn();
  render(<Shell shape="column" resize={{ onChange, onCommit }} />);
  const grip = screen.getByRole('separator', { name: 'Resize the assistant panel' });
  expect(grip.getAttribute('aria-valuenow')).toBe('420');
  expect(grip.getAttribute('aria-controls')).toBe(document.querySelector('.crewlet-app-shell__aside-sheet')!.id);
  fireEvent.keyDown(grip, { key: 'ArrowLeft' });
  expect(onChange).toHaveBeenCalledWith(436);
  expect(onCommit).toHaveBeenCalledWith(436);
});

test.each<AppShellAsideShape>(['overlay', 'sheet'])('as %s it is a named modal dialog with no grip', (shape) => {
  render(<Shell shape={shape} resize={{ onChange: () => {} }} />);
  const dialog = screen.getByRole('dialog', { name: 'Crewlet Assistant' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(root().getAttribute('data-aside')).toBe(shape);
  expect(screen.queryByRole('separator')).toBeNull();
  expect(document.querySelector('.crewlet-app-shell__aside-veil')).not.toBeNull();
});

test('as an overlay focus moves in, Escape closes it, and focus goes back to what opened it', () => {
  function Opener() {
    const [open, setOpen] = useState(false);
    return (
      <AppShell
        aside={open ? <button type="button">Inside</button> : null}
        asideShape="overlay"
        asideLabel="Crewlet Assistant"
        onAsideClose={() => setOpen(false)}
      >
        <button type="button" onClick={() => setOpen(true)}>
          Ask
        </button>
      </AppShell>
    );
  }
  render(<Opener />);
  const ask = screen.getByRole('button', { name: 'Ask' });
  ask.focus();
  fireEvent.click(ask);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Inside' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(ask);
});

test('as an overlay a press on the veil closes it', () => {
  const onClose = vi.fn();
  render(<Shell shape="overlay" onClose={onClose} />);
  const veil = document.querySelector<HTMLElement>('.crewlet-app-shell__aside-veil')!;
  fireEvent.pointerDown(veil);
  fireEvent.click(veil);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('as an overlay Tab stays inside', () => {
  render(
    <Shell
      shape="overlay"
      aside={
        <>
          <button type="button">First</button>
          <button type="button">Last</button>
        </>
      }
    />,
  );
  const last = screen.getByRole('button', { name: 'Last' });
  last.focus();
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
});

test('a change of shape keeps the panel mounted, so what the reader had in it survives', () => {
  function Field() {
    const [value, setValue] = useState('');
    return <input aria-label="Message" value={value} onChange={(event) => setValue(event.target.value)} />;
  }
  const { rerender } = render(<Shell shape="column" aside={<Field />} />);
  const field = screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement;
  fireEvent.change(field, { target: { value: 'Which tasks are blocked?' } });
  rerender(<Shell shape="overlay" aside={<Field />} />);
  const after = screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement;
  expect(after).toBe(field);
  expect(after.value).toBe('Which tasks are blocked?');
});

test('opening and closing the aside or the peek never remounts the scroller', () => {
  const { rerender } = render(<Shell />);
  const main = screen.getByRole('main');
  rerender(<Shell shape="column" />);
  expect(screen.getByRole('main')).toBe(main);
  rerender(<Shell shape="column" peek={<div>Task</div>} peekShape="column" />);
  expect(screen.getByRole('main')).toBe(main);
  rerender(<Shell />);
  expect(screen.getByRole('main')).toBe(main);
});

test('the peek stands beside the scroller under the bar, and is told its shape', () => {
  function Probe() {
    return <div data-testid="peek">{useAppShellPeek()?.shape}</div>;
  }
  render(<Shell peek={<Probe />} peekShape="drawer" />);
  const peek = screen.getByTestId('peek');
  expect(peek.textContent).toBe('drawer');
  expect(peek.parentElement).toBe(document.querySelector('.crewlet-app-shell__body'));
  expect(root().getAttribute('data-peek')).toBe('drawer');
});

test('a component in the aside is told the shape, and one outside is told nothing', () => {
  function Probe({ id }: { id: string }) {
    return <span data-testid={id}>{useAppShellAside()?.shape ?? 'none'}</span>;
  }
  render(<Shell shape="sheet" aside={<Probe id="inside" />}>{<Probe id="outside" />}</Shell>);
  expect(screen.getByTestId('inside').textContent).toBe('sheet');
  expect(screen.getByTestId('outside').textContent).toBe('none');
});

test('a side panel in the aside leaves the landmark and the grip to the shell, and takes focus to its heading', () => {
  render(
    <Shell
      shape="column"
      aside={
        <SidePanel title="Crewlet Assistant" onClose={() => {}} resizable width={420} onWidthChange={() => {}}>
          <p>Ask about anything on this page.</p>
        </SidePanel>
      }
    />,
  );
  expect(screen.getAllByRole('complementary')).toHaveLength(2); // the rail and the aside
  expect(screen.queryByRole('separator')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Crewlet Assistant' }));
});

test('carries no violation as a column and as an overlay', async () => {
  const run = async () => {
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    return result.violations.map((violation) => violation.id);
  };
  const { rerender } = render(<Shell shape="column" resize={{ onChange: () => {} }} />);
  expect(await run()).toEqual([]);
  await act(async () => {
    rerender(<Shell shape="overlay" />);
  });
  expect(await run()).toEqual([]);
});
