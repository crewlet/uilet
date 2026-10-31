/**
 * A side panel and its frame: a region named by its heading that takes focus
 * without a ring, Escape from anywhere inside, a grip with a value beside the
 * content, a modal dialog only as a sheet, and the artifact presets drawn
 * from the same parts under the names they have always published.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useRef, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { ArtifactPanel, ArtifactWorkspace } from '../ArtifactPanel/index.js';
import { ChatThread } from '../ChatThread/index.js';
import { SidePanel, SidePanelFrame, type SidePanelShape } from './index.js';

afterEach(cleanup);

function Harness({
  shape,
  initialFocus,
}: {
  shape?: SidePanelShape;
  initialFocus?: 'heading' | 'none';
}) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(420);
  return (
    <SidePanelFrame
      shape={shape}
      reserve={640}
      bodyLabel="Work"
      panel={
        open ? (
          <SidePanel
            title="Ask Crewlet"
            onClose={() => setOpen(false)}
            resizable
            width={width}
            onWidthChange={setWidth}
            initialFocus={initialFocus}
            footer={<input aria-label="Message" />}
          >
            <p>Ask about anything on this page.</p>
          </SidePanel>
        ) : null
      }
    >
      <button type="button" onClick={() => setOpen((o) => !o)}>
        Ask
      </button>
    </SidePanelFrame>
  );
}

function open() {
  const ask = screen.getByRole('button', { name: 'Ask' });
  ask.focus();
  fireEvent.click(ask);
  return ask;
}

test('is a complementary region named by its heading, level two', () => {
  render(
    <SidePanel title="Ask Crewlet" onClose={() => {}}>
      <p>Thread</p>
    </SidePanel>,
  );
  expect(screen.getByRole('complementary', { name: 'Ask Crewlet' })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 2, name: 'Ask Crewlet' })).toBeTruthy();
});

test('opening focuses the heading, which draws no ring, and closing from inside hands focus back', () => {
  render(<Harness />);
  const ask = open();
  const heading = screen.getByRole('heading', { name: 'Ask Crewlet' });
  expect(document.activeElement).toBe(heading);
  expect(heading.classList.contains('crewlet-side-panel__title--quiet')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Close Ask Crewlet' }));
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(document.activeElement).toBe(ask);
});

test('initialFocus none leaves focus where the page put it, and a ref takes it to a field', () => {
  render(<Harness initialFocus="none" />);
  const ask = open();
  expect(document.activeElement).toBe(ask);
  cleanup();

  function ToComposer() {
    const field = useRef<HTMLTextAreaElement>(null);
    return (
      <SidePanel title="Ask Crewlet" onClose={() => {}} initialFocus={field} footer={<textarea ref={field} aria-label="Message" />}>
        <p>Thread</p>
      </SidePanel>
    );
  }
  render(<ToComposer />);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Message' }));
});

test('Escape closes it from a field inside, unless something inside answered first', () => {
  const onClose = vi.fn();
  render(
    <SidePanel title="Ask Crewlet" onClose={onClose} footer={<input aria-label="Message" />}>
      <input aria-label="Search" onKeyDown={(event) => event.key === 'Escape' && event.preventDefault()} />
    </SidePanel>,
  );
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search' }), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message' }), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a hidden title still names the panel', () => {
  render(
    <SidePanel title="Ask Crewlet" hideTitle onClose={() => {}}>
      <p>Thread</p>
    </SidePanel>,
  );
  const heading = screen.getByRole('heading', { name: 'Ask Crewlet' });
  expect(heading.classList.contains('crewlet-side-panel__title--hidden')).toBe(true);
  expect(screen.getByRole('complementary', { name: 'Ask Crewlet' })).toBeTruthy();
});

test('a subtitle follows the title on its line, is not part of the name, and lets the head grow', () => {
  render(
    <SidePanelFrame panel={<SidePanel title="Thread" subtitle={<a href="#engineering">#engineering</a>} onClose={() => {}}>Replies</SidePanel>}>
      <p>Page</p>
    </SidePanelFrame>,
  );
  const region = screen.getByRole('complementary', { name: 'Thread' });
  const heading = screen.getByRole('heading', { level: 2, name: 'Thread' });
  const subtitle = screen.getByRole('link', { name: '#engineering' }).parentElement!;
  expect(subtitle.className).toContain('crewlet-side-panel__subtitle');
  // The title and the subtitle share one wrapper, the title first.
  expect(heading.parentElement).toBe(subtitle.parentElement);
  expect(heading.nextElementSibling).toBe(subtitle);
  expect(region.querySelector('.crewlet-side-panel__head')!.className).toContain('crewlet-side-panel__head--subtitled');

  // A head with no subtitle is drawn as it always was.
  cleanup();
  render(
    <SidePanelFrame panel={<SidePanel title="Details" onClose={() => {}}>About</SidePanel>}>
      <p>Page</p>
    </SidePanelFrame>,
  );
  const plain = screen.getByRole('heading', { level: 2, name: 'Details' });
  expect(plain.parentElement!.className).toContain('crewlet-side-panel__head');
  expect(plain.parentElement!.className).not.toContain('crewlet-side-panel__head--subtitled');
});

test('the subtitled head is a floor, not a height, and wraps the subtitle under an ellipsised title', () => {
  const remove = installSheets('SidePanel/SidePanel.css');
  try {
    render(
      <SidePanelFrame panel={<SidePanel title="Catch up" subtitle="#engineering" onClose={() => {}}>Summary</SidePanel>}>
        <p>Page</p>
      </SidePanelFrame>,
    );
    const head = document.querySelector<HTMLElement>('.crewlet-side-panel__head--subtitled')!;
    const drawn = getComputedStyle(head);
    expect(drawn.height).toBe('auto');
    expect(drawn.minHeight).not.toBe('');
    const heading = getComputedStyle(document.querySelector('.crewlet-side-panel__heading')!);
    expect(heading.flexWrap).toBe('wrap');
    expect(heading.alignItems).toBe('baseline');
    const title = getComputedStyle(screen.getByRole('heading', { level: 2, name: 'Catch up' }));
    expect(title.textOverflow).toBe('ellipsis');
    expect(title.whiteSpace).toBe('nowrap');
  } finally {
    remove();
  }
});

test('flush drops the body inset and publishes it as zero inside the body only', () => {
  const uninstall = installSheets('SidePanel/SidePanel.css');
  try {
    const panelOf = (flush?: boolean) => (
      <SidePanel title="Ask Crewlet" flush={flush} onClose={() => {}} footer={<input aria-label="Message" />}>
        <p>Thread</p>
      </SidePanel>
    );
    const { rerender } = render(panelOf());
    const panel = screen.getByRole('complementary', { name: 'Ask Crewlet' });
    const body = panel.querySelector<HTMLElement>('.crewlet-side-panel__body')!;
    const inset = (el: Element) => getComputedStyle(el).getPropertyValue('--crewlet-side-panel-inset').trim();
    const resting = inset(panel);
    expect(resting).not.toBe('0px');
    expect(inset(body)).toBe(resting);
    expect(body.classList.contains('crewlet-side-panel__body--flush')).toBe(false);

    rerender(panelOf(true));
    expect(body.classList.contains('crewlet-side-panel__body--flush')).toBe(true);
    expect(inset(body)).toBe('0px');
    // Outside the body the panel keeps its inset: the head and foot are unchanged.
    expect(inset(panel)).toBe(resting);
  } finally {
    uninstall();
  }
});

test('a flush body is not a scroll container, so focusing deep in a tall thread leaves it at the top', () => {
  // jsdom computes no layout and scrolls nothing on focus, so both are stated
  // here as the browser does them: the thread's content is taller than its
  // view, the body around it reports the overflow a stray descendant once
  // gave it (4752px around a 557px thread), and a focus scrolls every scroll
  // container between the element and the page to bring it into view. A
  // scroll container is a box whose overflow is not `visible` or `clip`.
  const uninstall = installSheets('SidePanel/SidePanel.css', 'ChatThread/ChatThread.css');
  const focus = HTMLElement.prototype.focus;
  const scrollsOnFocus = (el: Element) =>
    ['overflow', 'overflowX', 'overflowY'].some((key) => {
      const value = getComputedStyle(el)[key as 'overflow'];
      return value === 'auto' || value === 'scroll' || value === 'hidden';
    });
  const spy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options) {
    focus.call(this, options);
    if (options?.preventScroll) return;
    for (let el = this.parentElement; el; el = el.parentElement) {
      if (scrollsOnFocus(el) && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight - el.clientHeight;
    }
  });
  try {
    render(
      <SidePanel title="Ask Crewlet" flush onClose={() => {}} footer={<input aria-label="Message" />}>
        <ChatThread label="Conversation">
          {Array.from({ length: 30 }, (_, index) => (
            <p key={index}>Message {index + 1}</p>
          ))}
          <button type="button">Approve</button>
        </ChatThread>
      </SidePanel>,
    );
    const panel = screen.getByRole('complementary', { name: 'Ask Crewlet' });
    const body = panel.querySelector<HTMLElement>('.crewlet-side-panel__body')!;
    const log = screen.getByRole('log');
    const sized = (el: HTMLElement, client: number, scroll: number) => {
      Object.defineProperty(el, 'clientHeight', { configurable: true, value: client });
      Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scroll });
    };
    sized(body, 557, 4752);
    sized(log, 557, 4200);
    log.scrollTop = 0;

    expect(getComputedStyle(body).overflow).toBe('clip');
    screen.getByRole('button', { name: 'Approve' }).focus();
    expect(body.scrollTop).toBe(0);
    // The thread, which owns the scrolling, is what brought it into view.
    expect(log.scrollTop).toBe(4200 - 557);
  } finally {
    spy.mockRestore();
    uninstall();
  }
});

test('as a column it carries a grip with its width, and the frame publishes the content floor', () => {
  render(<Harness shape="column" />);
  open();
  const grip = screen.getByRole('separator', { name: 'Resize Ask Crewlet' });
  expect(grip.getAttribute('aria-valuenow')).toBe('420');
  fireEvent.keyDown(grip, { key: 'ArrowLeft', shiftKey: true });
  expect(grip.getAttribute('aria-valuenow')).toBe('484');
  const panel = screen.getByRole('complementary', { name: 'Ask Crewlet' });
  expect(panel.style.getPropertyValue('--crewlet-side-panel-width')).toBe('484px');
  const frame = document.querySelector<HTMLElement>('.crewlet-side-panel-frame')!;
  expect(frame.getAttribute('data-shape')).toBe('column');
  expect(frame.style.getPropertyValue('--crewlet-side-panel-reserve')).toBe('640px');
});

test('as a drawer it stays a region with no grip, and the content stays reachable', () => {
  render(<Harness shape="drawer" />);
  open();
  expect(screen.getByRole('complementary', { name: 'Ask Crewlet' })).toBeTruthy();
  expect(screen.queryByRole('separator')).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('as a sheet it is a modal dialog: Tab stays in it, Escape closes it, focus goes back', () => {
  render(<Harness shape="sheet" />);
  const ask = open();
  const dialog = screen.getByRole('dialog', { name: 'Ask Crewlet' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(screen.queryByRole('separator')).toBeNull();
  const field = screen.getByRole('textbox', { name: 'Message' });
  field.focus();
  fireEvent.keyDown(field, { key: 'Tab' });
  expect(dialog.contains(document.activeElement)).toBe(true);
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(ask);
});

test('the artifact presets keep every class and container name they published', () => {
  render(
    <ArtifactWorkspace
      bodyLabel="Notes"
      panel={
        <ArtifactPanel title="History" size="lg" onClose={() => {}} footer={<button type="button">Restore</button>}>
          <p>Versions</p>
        </ArtifactPanel>
      }
    >
      <p>Body</p>
    </ArtifactWorkspace>,
  );
  const panel = screen.getByRole('complementary', { name: 'History' });
  expect(panel.classList.contains('crewlet-artifact-panel')).toBe(true);
  expect(panel.classList.contains('crewlet-artifact-panel--lg')).toBe(true);
  for (const part of ['head', 'title', 'actions', 'body', 'foot']) {
    expect(panel.querySelector(`.crewlet-artifact-panel__${part}.crewlet-side-panel__${part}`)).not.toBeNull();
  }
  // The artifact's heading keeps its ring when the keyboard reaches it.
  expect(screen.getByRole('heading', { name: 'History' }).classList.contains('crewlet-side-panel__title--quiet')).toBe(false);
  const workspace = document.querySelector('.crewlet-artifact-workspace')!;
  expect(workspace.classList.contains('crewlet-side-panel-frame')).toBe(true);
  expect(workspace.getAttribute('data-shape')).toBe('auto');
  expect(document.querySelector('.crewlet-artifact-workspace__body')).not.toBeNull();
});

test('an expanded panel takes the frame and draws no grip', () => {
  render(
    <SidePanelFrame
      expanded
      panel={
        <ArtifactPanel title="Data" expanded onExpandedChange={() => {}} onClose={() => {}}>
          <p>Rows</p>
        </ArtifactPanel>
      }
    >
      <p>Body</p>
    </SidePanelFrame>,
  );
  expect(document.querySelector('.crewlet-side-panel-frame')!.getAttribute('data-panel')).toBe('expanded');
  expect(screen.getByRole('button', { name: 'Back to the side' })).toBeTruthy();
  expect(screen.queryByRole('separator')).toBeNull();
});

test('carries no violation as a column and as a sheet', async () => {
  const run = async () => {
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    return result.violations.map((violation) => violation.id);
  };
  render(<Harness shape="column" />);
  open();
  expect(await run()).toEqual([]);
  cleanup();
  render(<Harness shape="sheet" />);
  open();
  expect(await run()).toEqual([]);
});
