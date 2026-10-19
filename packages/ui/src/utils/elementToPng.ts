/** Why an element could not be turned into an image. */
export type ElementToPngReason = 'unsupported' | 'tainted' | 'empty';

/**
 * The refusal [elementToPng] answers, with a reason a host maps to its own
 * words: `unsupported` (this browser has no canvas, or could not draw the
 * element), `tainted` (the browser drew it and then refused to read the pixels
 * back, which Safari does to anything drawn through `foreignObject`), and
 * `empty` (the element has no size, so there is nothing to draw).
 */
export class ElementToPngError extends Error {
  readonly reason: ElementToPngReason;

  constructor(reason: ElementToPngReason, message: string) {
    super(message);
    this.name = 'ElementToPngError';
    this.reason = reason;
  }
}

export interface ElementToPngOptions {
  /** The colour painted under the element. Unset, the element's own computed background, else transparent. */
  background?: string | undefined;
  /** Device pixels per CSS pixel. Unset, the screen's own ratio. Clamped to 1 to 3. */
  scale?: number | undefined;
  /** Space around the element, in CSS pixels. */
  padding?: number | undefined;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The largest scale offered: past it a wide chart is a canvas most browsers refuse to allocate. */
const MAX_SCALE = 3;

/**
 * The properties an SVG node is drawn from. Copied as COMPUTED values, so a
 * CSS variable (`var(--color-data-1)`) arrives as the colour it resolved to:
 * the serialised image is drawn outside the page, where no stylesheet and no
 * custom property exists.
 */
const SVG_PROPERTIES = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'color',
  'stop-color',
  'stop-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'vector-effect',
  'visibility',
  'display',
] as const;

/**
 * Turns a drawn element (a chart) into a PNG, in the reader's own browser.
 *
 * WHY IN THE BROWSER: the engine renders nothing. A server that drew author
 * content into images would be a new place for that content to execute, and it
 * would draw one reader's figures into a file every other reader sees, where a
 * dashboard's numbers are decided per reader. The reader already holds exactly
 * what they are allowed to see, drawn; this copies it.
 *
 * TWO PATHS. An element that is, or holds nothing visible but, one `<svg>` is
 * serialised as that SVG with every node's computed style written onto it,
 * which every engine draws onto a canvas faithfully. Anything else (a chart
 * drawn in HTML and CSS) is cloned with its computed styles inlined into an
 * SVG `foreignObject`, which Chrome and Firefox draw and Safari refuses to
 * read back: that answers `tainted`, so the host can say this browser cannot
 * save this chart as an image rather than offering a blank file.
 */
export async function elementToPng(el: Element, options: ElementToPngOptions = {}): Promise<Blob> {
  const box = el.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) {
    throw new ElementToPngError('empty', 'The element has no size, so there is nothing to draw.');
  }
  const padding = Math.max(0, options.padding ?? 0);
  const width = Math.ceil(box.width + 2 * padding);
  const height = Math.ceil(box.height + 2 * padding);
  const ratio = options.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  const scale = Math.min(MAX_SCALE, Math.max(1, Number.isFinite(ratio) ? ratio : 1));
  const background = options.background ?? opaqueBackground(el);
  const markup = serializeElement(el, { width, height, padding });
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new ElementToPngError('unsupported', 'This browser cannot draw onto a canvas.');
  }
  context.scale(scale, scale);
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  try {
    context.drawImage(image, 0, 0, width, height);
  } catch {
    throw new ElementToPngError('unsupported', 'This browser could not draw the element.');
  }
  return toBlob(canvas);
}

/**
 * The element as one standalone SVG document of `width` by `height` CSS
 * pixels, its content `padding` in from the edge. Exported for a host that
 * wants the vector form itself, and for the suites.
 */
export function serializeElement(
  el: Element,
  { width, height, padding = 0 }: { width: number; height: number; padding?: number },
): string {
  const svg = soleSvg(el);
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  if (svg) {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    inlineSvgStyles(svg, copy);
    const box = svg.getBoundingClientRect();
    copy.setAttribute('x', String(padding));
    copy.setAttribute('y', String(padding));
    copy.setAttribute('width', String(box.width || width - 2 * padding));
    copy.setAttribute('height', String(box.height || height - 2 * padding));
    root.appendChild(copy);
  } else {
    const object = document.createElementNS(SVG_NS, 'foreignObject');
    object.setAttribute('x', String(padding));
    object.setAttribute('y', String(padding));
    object.setAttribute('width', String(width - 2 * padding));
    object.setAttribute('height', String(height - 2 * padding));
    const copy = el.cloneNode(true) as Element;
    inlineHtmlStyles(el, copy);
    object.appendChild(copy);
    root.appendChild(object);
  }
  // THE SERIALISER WRITES EVERY NAMESPACE DECLARATION ITSELF, the SVG root's
  // and the XHTML one a foreignObject's content needs, from the nodes' own
  // namespaces; an `xmlns` set by hand as well is a duplicate attribute, and a
  // document with one does not parse.
  return new XMLSerializer().serializeToString(root);
}

/** The one `<svg>` an element is or holds with nothing else visible beside it, else null. */
function soleSvg(el: Element): SVGSVGElement | null {
  if (el instanceof SVGSVGElement) return el;
  const svgs = el.querySelectorAll('svg');
  if (svgs.length !== 1) return null;
  const svg = svgs[0] as SVGSVGElement;
  // ANYTHING ELSE THAT CARRIES TEXT (a caption, a scale label drawn in HTML)
  // would be lost from the vector path, so it takes the HTML path instead.
  const clone = el.cloneNode(true) as Element;
  clone.querySelector('svg')?.remove();
  return (clone.textContent ?? '').trim() === '' ? svg : null;
}

/** Writes each source node's computed SVG properties onto its copy, as attributes the image reads. */
function inlineSvgStyles(source: Element, copy: Element): void {
  const computed = getComputedStyle(source);
  const declarations: string[] = [];
  for (const property of SVG_PROPERTIES) {
    const value = computed.getPropertyValue(property);
    if (value && !value.includes('var(')) declarations.push(`${property}:${value}`);
  }
  if (declarations.length > 0) copy.setAttribute('style', declarations.join(';'));
  copy.removeAttribute('class');
  const sourceChildren = source.children;
  const copyChildren = copy.children;
  for (let i = 0; i < sourceChildren.length && i < copyChildren.length; i++) {
    inlineSvgStyles(sourceChildren[i] as Element, copyChildren[i] as Element);
  }
}

/** Writes each source node's whole computed style onto its copy, for the foreignObject path. */
function inlineHtmlStyles(source: Element, copy: Element): void {
  const computed = getComputedStyle(source);
  const declarations: string[] = [];
  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i);
    if (property.startsWith('--')) continue;
    const value = computed.getPropertyValue(property);
    if (value && !value.includes('var(')) declarations.push(`${property}:${value}`);
  }
  copy.setAttribute('style', declarations.join(';'));
  copy.removeAttribute('class');
  const sourceChildren = source.children;
  const copyChildren = copy.children;
  for (let i = 0; i < sourceChildren.length && i < copyChildren.length; i++) {
    const child = sourceChildren[i] as Element;
    if (child instanceof SVGElement) inlineSvgStyles(child, copyChildren[i] as Element);
    else inlineHtmlStyles(child, copyChildren[i] as Element);
  }
}

/** The first opaque background up the tree from el, so the image is not drawn on transparency it never had. */
function opaqueBackground(el: Element): string | undefined {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const colour = getComputedStyle(node).backgroundColor;
    if (colour && colour !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(colour)) return colour;
  }
  return undefined;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new ElementToPngError('unsupported', 'This browser could not draw the element as an image.'));
    image.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new ElementToPngError('tainted', 'This browser drew the element and would not let the image be saved.'));
      }, 'image/png');
    } catch {
      // A SecurityError: the canvas is tainted by what was drawn on it.
      reject(new ElementToPngError('tainted', 'This browser drew the element and would not let the image be saved.'));
    }
  });
}
