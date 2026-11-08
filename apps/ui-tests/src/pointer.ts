/**
 * The pointers a suite's window reports: `touch` is a phone (a coarse primary
 * pointer and no fine one anywhere), `hybrid` a laptop with a touch screen (a
 * coarse primary pointer beside a fine one), `fine` a desk. Every other media
 * query answers false. Returns the restore.
 */
export function installPointer(kind: 'touch' | 'hybrid' | 'fine'): () => void {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  const answer = (query: string): boolean => {
    if (query === '(pointer: coarse)') return kind !== 'fine';
    if (query === '(any-pointer: fine)') return kind !== 'touch';
    return false;
  };
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: answer(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  return () => {
    if (had) Object.defineProperty(globalThis, 'matchMedia', had);
    else delete (globalThis as Record<string, unknown>).matchMedia;
  };
}
