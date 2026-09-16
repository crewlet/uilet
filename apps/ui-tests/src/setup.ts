/**
 * What jsdom does not provide, and the component suites need.
 *
 * Kept to the genuine gaps. A polyfill that changed behaviour rather than
 * supplying a missing API would make the suite agree with a browser nobody
 * runs.
 *
 * Every gap is detected by READING the property, never by `'name' in
 * globalThis`. The runner declares several of these names and leaves them
 * holding undefined, so an `in` check answers "present" and skips the
 * polyfill, and the suites then fail exactly as they had before it existed:
 * `globalThis.matchMedia is not a function`. Reading can also throw, which is
 * the same reason production code wraps its own storage read.
 */

function missing(name: string): boolean {
  try {
    return (globalThis as unknown as Record<string, unknown>)[name] === undefined;
  } catch {
    return true;
  }
}

function provide(name: string, value: unknown): void {
  if (missing(name)) Object.defineProperty(globalThis, name, { writable: true, configurable: true, value });
}

// Both are read at module scope by layout-aware components, so their absence
// is a throw rather than a wrong answer.
provide('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}));

provide(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
);

provide('scrollTo', () => {});

/*
 * Web Storage is the gap that only shows up on somebody else's machine. jsdom
 * exposes it from the document's ORIGIN, so whether it is there depends on how
 * the environment was constructed rather than on the version.
 *
 * An in-memory Storage rather than a mock: the production reads are wrapped in
 * try and catch precisely because a real browser can refuse them, so a double
 * that cannot store would exercise the fallback on every run and never the
 * path a reader actually takes.
 *
 * sessionStorage has the same origin dependence and is filled by the same
 * factory rather than a second copy, so the two areas cannot come to behave
 * differently here while they behave the same in a browser. Each area gets its
 * OWN map: a key written to one must not be readable from the other.
 */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

for (const area of ['localStorage', 'sessionStorage'] as const) {
  provide(area, memoryStorage());
}
