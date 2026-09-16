/**
 * The runner itself, because every component suite inherits its answers.
 *
 * Each case here covers a failure that takes the WHOLE run with it rather than
 * one test: a module that cannot be loaded, a jsdom gap read at module scope,
 * a storage area that is not there.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@crewlethq/ui';
import config from '../vitest.config';

describe('the runner', () => {
  test('a uilet component mounts, its stylesheet imports and all', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
  });

  test("the built @crewlethq/ui entry loads, its 29 side-effect CSS imports and all", async () => {
    /*
     * The published entry opens with a CSS import per component. Node has no
     * loader for one, so a runner that hands the module to Node rather than to
     * Vite throws `TypeError: Unknown file extension ".css"` on the first
     * import and fails every test in the run, not just this one.
     */
    const built = await import('../../../packages/ui/dist/index.js');
    /*
     * RENDERED, not `typeof`. Button forwards a ref, and a forwardRef
     * component is an exotic OBJECT rather than a function, so a type check
     * would go red on a package that loaded perfectly well. What this case is
     * about is that the module loaded at all.
     */
    render(<built.Button>Built</built.Button>);
    expect(screen.getByRole('button', { name: 'Built' })).toBeDefined();
  });

  test('the runner keeps the @crewlethq scope inlined', () => {
    /*
     * The case above loads the entry by a relative path, which Vite transforms
     * whatever this setting says. The setting is what covers the same entry
     * reached through node_modules, which is how every consumer reaches it and
     * how the engine reproduced the failure. A workspace resolves its own
     * packages through a symlink to a real path outside node_modules, so that
     * arrangement cannot be reproduced from inside this repository: the
     * declaration is asserted instead, so deleting it fails here rather than
     * in a consumer.
     */
    const inline = config.test?.server?.deps?.inline;
    expect(Array.isArray(inline) && inline.some((rule) => String(rule) === String(/@crewlethq\//))).toBe(true);
  });
});

describe('the jsdom gaps the setup file fills', () => {
  test('matchMedia, ResizeObserver and scrollTo answer', () => {
    expect(globalThis.matchMedia('(min-width: 900px)').matches).toBe(false);
    expect(typeof globalThis.ResizeObserver).toBe('function');
    expect(typeof globalThis.scrollTo).toBe('function');
  });

  test('each storage area is real, and separate from the other', () => {
    localStorage.setItem('crewlet_theme', 'dark');
    expect(localStorage.getItem('crewlet_theme')).toBe('dark');
    expect(sessionStorage.getItem('crewlet_theme')).toBe(null);
    localStorage.clear();
    expect(localStorage.getItem('crewlet_theme')).toBe(null);
  });
});
