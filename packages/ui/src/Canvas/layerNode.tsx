/**
 * Hands a surface the element its own LayerHost provides.
 *
 * WHY IT EXISTS. A host keeps its element in state and publishes it through
 * context, so the only way to reach it is from inside. A surface that draws a
 * host over content that MOVES (a canvas that pans and zooms, a grid that
 * scrolls sideways) has to dispatch `LAYER_REPOSITION_EVENT` on that element
 * whenever the content moves, which is what an open menu or picker listens to
 * in order to follow its anchor or close with it. So a component renders this
 * inside its host and keeps what it reports.
 *
 * ONE COPY, imported by the canvas and by the grid. Written twice it would be
 * two places to get the document body case wrong. It belongs here rather than
 * in the Layer module only because this package's Layer folder has another
 * owner; the right home for it is beside `LayerHost`, as a hook that answers
 * with the host's own element (see the note in the package README).
 */

import { useLayoutEffect, useRef } from 'react';
import { useLayerContainer } from '../Layer/index.js';

export function LayerNodeBridge({ onNode }: { onNode: (el: HTMLElement | null) => void }) {
  const container = useLayerContainer();
  const report = useRef(onNode);
  report.current = onNode;
  useLayoutEffect(() => {
    // The host's own element once it has mounted. `useLayerContainer` answers
    // with the document body until then, and the body is nobody's layer.
    report.current(container && container !== document.body ? container : null);
  }, [container]);
  return null;
}
