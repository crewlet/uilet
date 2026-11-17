/**
 * A wrapping reference set in a sentence whose links are underlined at rest is
 * underlined whole, its first word included, and its mark is not.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { ArtifactRef } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
});

test("a wrapping link's first word takes the underline its sentence gives links", () => {
  host = document.createElement('div');
  document.body.append(host);
  const style = document.createElement('style');
  style.textContent = '.sentence a { text-decoration: underline; } .plain a { text-decoration: none; }';
  host.append(style);
  root = createRoot(host.appendChild(document.createElement('div')));
  flushSync(() =>
    root!.render(
      <>
        <p className="sentence">
          See the <ArtifactRef kind="doc" title="Launch plan for the spring" href="#/artifacts/a1" /> first.
        </p>
        <p className="plain">
          See the <ArtifactRef kind="doc" title="Launch plan for the spring" href="#/artifacts/a1" /> first.
        </p>
      </>,
    ),
  );
  const [underlined, plain] = [...host.querySelectorAll('a')];
  const head = (a: Element) => getComputedStyle(a.querySelector('.crewlet-inline-ref__head')!).textDecorationLine;
  expect(head(underlined!)).toBe('underline');
  expect(getComputedStyle(underlined!).textDecorationLine).toBe('underline');
  expect(head(plain!)).toBe('none');
});
