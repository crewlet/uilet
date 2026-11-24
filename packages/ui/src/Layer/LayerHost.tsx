import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/**
 * Where an overlay is drawn, when `document.body` is the wrong answer.
 *
 * A FULLSCREEN ELEMENT RENDERS ONLY ITS OWN SUBTREE. Everything in the
 * document outside it, `document.body` included, is not painted at all, so a
 * dialog, a menu or a toast portalled to the body while a builder canvas is
 * fullscreen is simply invisible: the reader presses a button and nothing
 * happens. The same is true of a browser print view and of any element drawn
 * in the top layer.
 *
 * So an overlay portals into the NEAREST HOST and falls back to the body, and
 * a surface that can go fullscreen wraps its content in one. The host does not
 * decide what paints on top; the layer stack does, from opening order.
 */
/**
 * What a host takes. `all` (the default) holds every overlay opened inside it, a
 * fullscreen surface's case. `anchored` holds only overlays placed against an anchor
 * (menus, popovers, tooltips); a dialog or a toast skips it for the next host or the body.
 */
export type LayerHostTakes = 'all' | 'anchored';

/** Where an overlay is drawn: `anchored` beside its trigger, `viewport` over the screen. */
export type LayerPlacement = 'anchored' | 'viewport';

interface Host {
  node: HTMLElement | null;
  takes: LayerHostTakes;
  parent: Host | null;
}

const LayerContext = createContext<Host | null>(null);

export interface LayerHostProps {
  children?: ReactNode;
  className?: string | undefined;
  /** `all` (the default) or `anchored`: see `LayerHostTakes`. */
  takes?: LayerHostTakes | undefined;
}

/**
 * Provides a portal target for every overlay rendered inside it.
 *
 * The target is a sibling AFTER the children, covering the host's own box, so
 * a surface placed against `getBoundingClientRect()` is placed against the
 * container rather than the window. It takes no pointer events itself, so the
 * content beneath stays live while nothing is open; each overlay inside takes
 * them back for its own panel.
 */
export function LayerHost({ children, className, takes = 'all' }: LayerHostProps) {
  const parent = useContext(LayerContext);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const host = useMemo<Host>(() => ({ node, takes, parent }), [node, takes, parent]);
  return (
    <LayerContext.Provider value={host}>
      {children}
      <div ref={setNode} className={cx('crewlet-layer-host', className)} data-takes={takes} />
    </LayerContext.Provider>
  );
}

/**
 * The element an overlay rendered here should portal into: for an `anchored` one
 * (the default) the nearest host, for a `viewport` one (a dialog, a sheet, a toast)
 * the nearest host that takes all, else the document body.
 *
 * `null` on the server; a host whose element is not yet measured gives the body.
 */
export function useLayerContainer(kind: LayerPlacement = 'anchored'): HTMLElement | null {
  let host = useContext(LayerContext);
  if (kind === 'viewport') while (host && host.takes !== 'all') host = host.parent;
  if (host?.node) return host.node;
  return typeof document === 'undefined' ? null : document.body;
}
