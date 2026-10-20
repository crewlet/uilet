/**
 * Still copies: what a live preview drew, kept as plain DOM with nothing live
 * behind it, and where they are kept between one mount and the next.
 *
 * A COPY IS THE DRAWN DOM, CLONED. It holds no React tree, no subscription,
 * no observer and no timer: it is what the content looked like the moment it
 * said it had drawn, and it never changes after. Nothing in it loads or runs:
 * a canvas is copied as an image of what it drew, and anything that would
 * load again (a frame, a video, audio, an embedded object) is left out of
 * the copy, since a clone of one starts again from nothing.
 *
 * KEPT BY KEY for as long as the store lives. A gallery's cards mount and
 * unmount as its filters, shape and pages change; a card that comes back
 * under the same key is given the copy it already drew, so it reads nothing
 * and draws nothing again until the page is loaded afresh.
 */

/** A still copy: the nodes, and the width they were laid out at before they were scaled. */
export interface LivePreviewStill {
  nodes: Node[];
  /** The layout width the content was given, or undefined where it filled the box at its own size. */
  width: number | undefined;
  /** The box's size when it was drawn: a copy with no layout width is good at this size only. */
  size: { w: number; h: number };
}

/** What a key holds: a still copy, or a preview that had nothing to draw. */
export type LivePreviewKept = LivePreviewStill | 'failed';

export interface LivePreviewStills {
  get(key: string): LivePreviewKept | undefined;
  put(key: string, kept: LivePreviewKept): void;
  forget(key: string): void;
  /**
   * Tells `told` the box's size whenever it changes, and answers how to stop.
   * ONE ResizeObserver for every copy the store's previews show: a copy is
   * scaled to its box when the box changes size (a window resized, a panel
   * opened), and a gallery holds one observer rather than one per card.
   */
  watch(el: Element, told: (size: { w: number; h: number }) => void): () => void;
}

/**
 * The most still copies a store keeps, the oldest dropped first. Two hundred
 * is four pages of a listing at fifty, the size a gallery asks the engine
 * for; a preview whose copy was dropped draws again when it comes back.
 */
export const LIVE_PREVIEW_STILLS_KEPT = 200;

export function createLivePreviewStills(kept: number = LIVE_PREVIEW_STILLS_KEPT): LivePreviewStills {
  // A Map keeps insertion order, and a put moves its key to the end, so the
  // first key is the one drawn or used longest ago.
  const held = new Map<string, LivePreviewKept>();
  const sized = new Map<Element, (size: { w: number; h: number }) => void>();
  let watcher: ResizeObserver | null = null;
  return {
    get(key) {
      const got = held.get(key);
      if (got !== undefined) {
        held.delete(key);
        held.set(key, got);
      }
      return got;
    },
    put(key, value) {
      held.delete(key);
      held.set(key, value);
      while (held.size > kept) held.delete(held.keys().next().value!);
    },
    forget(key) {
      held.delete(key);
    },
    watch(el, told) {
      if (typeof ResizeObserver === 'undefined') return () => {};
      watcher ??= new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.target.getBoundingClientRect();
          sized.get(entry.target)?.({ w: rect.width, h: rect.height });
        }
      });
      sized.set(el, told);
      watcher.observe(el);
      return () => {
        sized.delete(el);
        watcher?.unobserve(el);
      };
    },
  };
}

/** Elements a copy leaves out: each would load again from nothing in a clone. */
const LOADS = 'iframe, frame, video, audio, object, embed';

/**
 * A still copy of `nodes`: cloned, each canvas replaced by an image of what
 * it drew (or left blank where its pixels cannot be read), and every element
 * that would load again left out.
 */
export function copyOf(nodes: readonly Node[]): Node[] {
  return nodes.flatMap((node) => {
    if (!(node instanceof Element)) return [node.cloneNode(true)];
    if (node.matches(LOADS)) return [];
    const copy = node.cloneNode(true) as Element;
    const drawn = node.querySelectorAll('canvas');
    copy.querySelectorAll('canvas').forEach((blank, i) => {
      const image = pictureOf(drawn[i]!, blank);
      if (image) blank.replaceWith(image);
    });
    for (const loads of copy.querySelectorAll(LOADS)) loads.remove();
    if (node instanceof HTMLCanvasElement) return [pictureOf(node, copy as HTMLCanvasElement) ?? copy];
    return [copy];
  });
}

/** An image of what a canvas drew, sized as the canvas is, or null where its pixels cannot be read. */
function pictureOf(canvas: HTMLCanvasElement, copy: HTMLCanvasElement): HTMLImageElement | null {
  let src: string;
  try {
    src = canvas.toDataURL();
  } catch {
    // A canvas that drew another origin's pixels cannot be read: its copy stays blank.
    return null;
  }
  const image = canvas.ownerDocument.createElement('img');
  image.src = src;
  image.alt = '';
  for (const { name, value } of copy.attributes) if (name !== 'width' && name !== 'height') image.setAttribute(name, value);
  image.style.width = `${canvas.clientWidth}px`;
  image.style.height = `${canvas.clientHeight}px`;
  return image;
}
