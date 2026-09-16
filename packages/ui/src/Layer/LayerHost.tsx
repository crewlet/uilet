import { createContext, useContext, useState, type ReactNode } from 'react';
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
const LayerContext = createContext<HTMLElement | null>(null);

export interface LayerHostProps {
  children?: ReactNode;
  className?: string | undefined;
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
export function LayerHost({ children, className }: LayerHostProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  return (
    <LayerContext.Provider value={node}>
      {children}
      <div ref={setNode} className={cx('crewlet-layer-host', className)} />
    </LayerContext.Provider>
  );
}

/**
 * The element an overlay rendered here should portal into.
 *
 * `null` before the host's own element is measured and on the server, which is
 * what a caller renders nothing for; everywhere else it is the nearest host,
 * or the document body.
 */
export function useLayerContainer(): HTMLElement | null {
  const host = useContext(LayerContext);
  if (host) return host;
  return typeof document === 'undefined' ? null : document.body;
}
