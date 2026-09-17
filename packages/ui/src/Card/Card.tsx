import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Count } from '../Count/index.js';
import { cx } from '../utils/cx.js';
import { CardHeaderSlotContext, type CardHeaderSlot } from './headerSlot.js';
import {
  HeadingLevelProvider,
  headingTag,
  nextHeadingLevel,
  useHeadingLevel,
  type HeadingLevel,
} from '../utils/headingLevel.js';

export type CardVariant =
  /** One step above the page. */
  | 'default'
  /**
   * The TILE: the panel's ground with none of its lift, at the tighter inset,
   * for one of many records in a grid. Its default padding is `tight`.
   */
  | 'subtle'
  /** Transparent, with a strong border. */
  | 'outlined'
  /**
   * A well INSIDE a card: the inset ground, the tighter radius, no border of
   * its own. What a record's own sub-block takes.
   */
  | 'inset'
  /**
   * The same ground at the tighter radius, with no elevation. What a nested
   * card takes so two borders at one radius do not read as a box drawn twice.
   */
  | 'quiet'
  /** Lifted off the page. */
  | 'elevated'
  /**
   * A dashed boundary: something that is not quite a record yet. A seat held
   * by a person rather than an agent, a slot waiting to be filled.
   */
  | 'dashed';

/**
 * `tight` is 12px on every edge, the inset a tile in a grid takes. `sm` is
 * VERTICAL ONLY, because a card has one left edge and its header sets it:
 * reducing the horizontal inset too puts content on a different vertical line
 * from the title above it, and pushes a code block against the card's right
 * edge with nowhere for its scrollbar to sit. What it is for is content whose
 * rows carry their own vertical rhythm, which is a claim about height rather
 * than about the edge.
 */
export type CardPadding = 'none' | 'tight' | 'sm' | 'md' | 'lg';

/**
 * A section's own padding, on the SAME five steps as the card's own, so one
 * word names one inset wherever it is said. They were two scales sharing two
 * words: `tight` meant 12px on every edge on the card and a vertical-only step
 * on a section, and `md` meant 16px on a card and on a body but 8px over 16px
 * on a footer. A caller who read the card's steps and wrote one on a body got
 * a different inset than the one documented, with nothing to say so.
 */
export type CardSectionPadding = CardPadding;

/**
 * A rail down the card's leading edge, carrying a STATE. The three states a
 * record can be in that a reader scans a grid for, and nothing else: identity
 * (whose seat, which unit, which vendor) is carried by name, glyph and
 * position, never by colour.
 */
export type CardRail = 'info' | 'warning' | 'danger';

export type CardElement = 'div' | 'section' | 'article' | 'li';

interface CardContextValue {
  /** The level `Card.Title` renders at, which is the card's own level. */
  titleLevel: HeadingLevel;
  /** The id that title takes, so a sectioning card can be named by it. */
  titleId: string;
  /** Called by a rendered title, so the card knows it has one to point at. */
  registerTitle: () => void;
  /**
   * Where the header's own chrome node is handed up, so the panel inside the
   * card can draw its controls onto the header row. See `headerSlot.ts`.
   */
  hostChrome: (node: HTMLElement | null) => void;
}

const CardContext = createContext<CardContextValue | null>(null);

interface CardLook {
  variant?: CardVariant | undefined;
  /**
   * The inset the card's own content takes. `none` lets a table sit flush.
   *
   * WHERE IT IS APPLIED depends on the recipe. A card given raw children takes
   * it on its own surface. A card built from `Card.Header`, `Card.Body` or
   * `Card.Footer` is FLUSH and never carries padding itself, because its slots
   * carry theirs and have to reach its edges: there it is the inset of
   * whatever the card holds BESIDE those slots, which the card draws in a body
   * of its own. Left unset it is `md`, or `tight` for a `subtle` tile.
   */
  padding?: CardPadding | undefined;
  /** Hover, pointer and focus states. Implied by `href` and `asChild`. */
  interactive?: boolean | undefined;
  rail?: CardRail | undefined;
  /** This card is the one the reader has chosen. */
  selected?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

export interface CardProps extends HTMLAttributes<HTMLElement>, CardLook {
  /**
   * The element to draw. `section` and `article` are named by `Card.Title`
   * when there is one, so a screen reader listing a page's regions finds the
   * card by its own heading.
   */
  as?: CardElement | undefined;
  /**
   * The whole card goes somewhere. It draws a REAL anchor: a card that
   * navigates from a click handler cannot be opened in a tab, copied, or
   * announced as a link.
   */
  href?: string | undefined;
  /** Render the single child element as the card, for a router's own Link. */
  asChild?: boolean | undefined;
}

/** Whether a child is one of the card's own slot components, by identity. */
const isSlot = (node: ReactNode): boolean =>
  isValidElement(node) && SLOT_TYPES.has(node.type as unknown as object);

/** What a card found among its own children. */
interface CardSlotsFound {
  /** The children, with every fragment that holds a slot opened out. */
  nodes: ReactNode[];
  /**
   * At least one slot component. A card built from these is the FLUSH recipe:
   * the slots carry the padding and the card clips them to its radius, which
   * is what puts the header's hairline and a table's first row on the card's
   * own edges.
   */
  any: boolean;
  /** A header, which is a row the panel below it can put its controls on. */
  header: boolean;
}

/**
 * The slot components a card holds, by identity. Read from the children at
 * render time rather than registered from an effect, so the first painted
 * frame is already right; an effect would pad the card for one frame and then
 * drop it, and would leave a panel drawing a bar it is about to lose.
 */
function slotsIn(children: ReactNode): CardSlotsFound {
  const found: CardSlotsFound = { nodes: [], any: false, header: false };
  for (const child of Children.toArray(children)) {
    /*
     * THROUGH A FRAGMENT. `Children.toArray` flattens a nested ARRAY and stops
     * at a fragment, which is one element to it, and a fragment is how slots
     * reach a card whenever they are rendered from a condition: the ordinary
     * `{loaded ? <><Card.Header /><Card.Body /></> : <Skeleton />}`. Without
     * the descent that card takes its own padding AND its slots take theirs,
     * so every inset is doubled and the header's rule stops short of both
     * edges, with nothing to say why.
     *
     * A fragment with NO slot in it is left closed. It is one piece of the
     * card's own content, and opening it would spread what a caller wrote as
     * one block over several bodies.
     */
    if (isValidElement(child) && child.type === Fragment) {
      const nested = slotsIn((child.props as { children?: ReactNode }).children);
      if (nested.any) {
        found.nodes.push(...nested.nodes);
        found.any = true;
        found.header = found.header || nested.header;
        continue;
      }
    }
    found.nodes.push(child);
    if (!isValidElement(child)) continue;
    if (child.type === (CardHeader as unknown as object)) {
      found.any = true;
      found.header = true;
      continue;
    }
    if (isSlot(child)) found.any = true;
  }
  return found;
}

/**
 * A flush card's children, with every run of children that is NOT a slot drawn
 * in a body of its own.
 *
 * WHY THE CARD DOES THIS RATHER THAN THE CALLER. The flush recipe takes the
 * padding off the card, because the slots carry their own and have to reach
 * its edges. A child that is not a slot carries none, so without this it is
 * drawn hard against the border while the title above it sits at the card's
 * inset: one line indented and the next not, inside one card. Nothing said so
 * at the call site either, because the recipe is chosen by the PRESENCE of a
 * header, three lines above the content that lost its inset. It was the shape
 * of most of the engine dashboard's panels, and the first sentence to land
 * against a border was papered over inside the chart that drew it rather than
 * here, which fixed that one line and left every sibling where it was.
 *
 * At `none` there is nothing to add, and the run is left exactly as it was
 * written: a table asked to reach the card's edges must not collect a box, a
 * column direction and a gap on the way there.
 */
function withBodies(nodes: ReactNode[], padding: CardSectionPadding): ReactNode {
  if (padding === 'none') return nodes;
  const out: ReactNode[] = [];
  let run: ReactNode[] = [];
  const close = () => {
    if (run.length === 0) return;
    out.push(
      // Keyed on the position among the card's own children, which is where
      // this body is, so a run that gains or loses a node is an update rather
      // than a remount of everything inside it.
      <CardBody key={`body-${out.length}`} padding={padding}>
        {run}
      </CardBody>,
    );
    run = [];
  };
  for (const node of nodes) {
    if (isSlot(node)) {
      close();
      out.push(node);
      continue;
    }
    run.push(node);
  }
  close();
  return out;
}

function cardClass(
  { variant = 'default', padding = 'md', interactive, rail, selected, className }: CardLook,
  flush: boolean,
  extra?: string,
) {
  return cx(
    'crewlet-card',
    `crewlet-card--${variant}`,
    `crewlet-card--p-${padding}`,
    flush && 'crewlet-card--flush',
    rail && `crewlet-card--rail-${rail}`,
    selected && 'is-selected',
    interactive && 'is-interactive',
    extra,
    className,
  );
}

/**
 * The surface a record is drawn on.
 *
 * WHAT A CARD IS FOR: one record, with its own title, its own body and its own
 * controls. A grid of cards is a set of records a reader compares; a card with
 * nothing to title is a `div` with a border, and a stack of those is a table
 * that has thrown away its column headers.
 */
const CardRoot = ({
  variant = 'default',
  padding,
  interactive = false,
  rail,
  selected = false,
  as = 'div',
  href,
  asChild = false,
  className,
  children,
  ...rest
}: CardProps) => {
  const level = useHeadingLevel();
  const titleId = useId();
  const [hasTitle, setHasTitle] = useState(false);
  const navigates = href !== undefined || asChild;
  const inner = asChild && isValidElement(children)
    ? ((children as ReactElement<Record<string, unknown>>).props['children'] as ReactNode)
    : children;
  const slots = slotsIn(inner);
  const flush = slots.any;
  /*
   * WHERE THE PADDING GOES, which is the whole of the two recipes.
   *
   * A FLUSH CARD CARRIES NONE, always: its slots carry their own and have to
   * reach its edges, so padding on the card itself would double every inset
   * and stop the header's rule short of both sides. An explicit `padding` does
   * not change that; it names the inset of whatever the card holds BESIDE its
   * slots, and `withBodies` is what applies it there.
   *
   * A TILE IS TIGHTER THAN A PANEL: a `subtle` card is one of many records in
   * a grid and takes the tighter step; every other card given raw children is
   * a panel.
   */
  const contentPadding: CardSectionPadding = padding ?? 'md';
  const classes = cardClass(
    {
      variant,
      padding: flush ? 'none' : (padding ?? (variant === 'subtle' ? 'tight' : 'md')),
      interactive: interactive || navigates,
      rail,
      selected,
      className,
    },
    flush,
  );
  const content = flush ? withBodies(slots.nodes, contentPadding) : children;

  /*
   * The header's chrome node, and who holds it. The node is STATE because a
   * panel below has to re-render once it exists; who holds it is a REF because
   * nothing is drawn differently by the answer except the claimant itself,
   * which is told in the same breath it asks.
   */
  const [chromeNode, setChromeNode] = useState<HTMLElement | null>(null);
  const chromeHolder = useRef<object | null>(null);
  const hostChrome = useCallback((node: HTMLElement | null) => setChromeNode(node), []);
  const claimChrome = useCallback((claimant: object) => {
    chromeHolder.current ??= claimant;
    return chromeHolder.current === claimant;
  }, []);
  const releaseChrome = useCallback((claimant: object) => {
    if (chromeHolder.current === claimant) chromeHolder.current = null;
  }, []);
  const headerSlot = useMemo<CardHeaderSlot>(
    () => ({
      hasHeader: slots.header,
      node: chromeNode,
      claim: claimChrome,
      release: releaseChrome,
    }),
    [slots.header, chromeNode, claimChrome, releaseChrome],
  );

  const context: CardContextValue = {
    titleLevel: level,
    titleId,
    registerTitle: () => setHasTitle(true),
    hostChrome,
  };

  /*
   * The card's own title is its heading; everything INSIDE the card is one
   * level deeper. Without this a card's body headings would repeat the card's
   * level, and a reader navigating by heading would meet a flat list where
   * there is a hierarchy.
   */
  const body = (
    <CardContext.Provider value={context}>
      <CardHeaderSlotContext.Provider value={headerSlot}>
        <HeadingLevelProvider level={nextHeadingLevel(level)}>{content}</HeadingLevelProvider>
      </CardHeaderSlotContext.Provider>
    </CardContext.Provider>
  );

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('Card with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<Record<string, unknown>>;
    return cloneElement(
      childEl,
      { ...rest, className: cx(childEl.props['className'] as string | undefined, classes) },
      <CardContext.Provider value={context}>
        <CardHeaderSlotContext.Provider value={headerSlot}>
          <HeadingLevelProvider level={nextHeadingLevel(level)}>{content}</HeadingLevelProvider>
        </CardHeaderSlotContext.Provider>
      </CardContext.Provider>,
    );
  }

  if (href !== undefined) {
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} href={href} className={classes}>
        {body}
      </a>
    );
  }

  const Tag = as;
  const sectioning = as === 'section' || as === 'article';
  return (
    <Tag
      {...rest}
      className={classes}
      /*
       * Only once a title has rendered. A reference to an id nothing carries
       * leaves the region with no name at all, which is worse than the
       * unnamed region it was meant to fix.
       */
      aria-labelledby={sectioning && hasTitle ? (rest['aria-labelledby'] ?? titleId) : rest['aria-labelledby']}
    >
      {body}
    </Tag>
  );
};

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The hairline under the header. ON by default: the header is a bar with a
   * rule under it, which is the shape a reader meets on every screen. Turn it
   * off for a card whose body is one paragraph, where a rule separates a title
   * from the sentence that finishes it.
   */
  divided?: boolean | undefined;
  /** A glyph before the title. Decoration: the title carries the meaning. */
  icon?: ReactNode;
  /** How many of something the card is about. */
  count?: number | string | undefined;
  /** A second line under the title. It truncates; a title does not. */
  subtitle?: ReactNode;
  /** The card's own controls, at the end of the header row. */
  actions?: ReactNode;
}

/*
 * ONE LINE: the name, then what qualifies it, then the card's own controls,
 * and last the controls of the panel the card holds. The subtitle sits BESIDE
 * the title rather than under it, because a title stacked over a subtitle
 * makes the header two lines tall and every card in a grid taller than the one
 * fact it is showing.
 */
const CardHeader = ({
  divided = true,
  icon,
  count,
  subtitle,
  actions,
  className,
  children,
  ...rest
}: CardHeaderProps) => {
  const card = useContext(CardContext);
  const host = card?.hostChrome;
  /*
   * A STABLE callback, never an inline one. React hands a ref callback null
   * and then the node again whenever its identity changes, so an inline arrow
   * here would report the node gone and back on every render: the panel below
   * would unmount and remount its controls in a loop.
   */
  const chromeRef = useCallback(
    (node: HTMLDivElement | null) => {
      host?.(node);
    },
    [host],
  );
  return (
    <div {...rest} className={cx('crewlet-card__header', !divided && 'crewlet-card__header--plain', className)}>
      <div className="crewlet-card__header-main">
        {icon === undefined ? null : (
          <span className="crewlet-card__header-icon" aria-hidden>
            {icon}
          </span>
        )}
        {children}
        {count === undefined ? null : <Count value={count} />}
      </div>
      {subtitle === undefined ? null : <span className="crewlet-card__subtitle">{subtitle}</span>}
      {actions === undefined ? null : <div className="crewlet-card__header-actions">{actions}</div>}
      {/*
        * WHERE THE PANEL'S OWN CONTROLS GO: a table's pager and its settings
        * cog, drawn on this row rather than in a bar of their own under it.
        * Always rendered inside a card, because the panel that fills it is
        * below this header in the tree and cannot be waited for without
        * drawing the row twice; the stylesheet gives an empty one no box at
        * all, so a card holding no such panel is the header it always was.
        */}
      {card === null ? null : <div className="crewlet-card__header-chrome" ref={chromeRef} />}
    </div>
  );
};

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * This section's own padding. It is APPLIED, rather than declared and passed
   * to the DOM: the prop used to fall through into the rest spread and render
   * as a `padding="md"` attribute on a div, where it did nothing at all.
   */
  padding?: CardSectionPadding | undefined;
}

const CardBody = ({ padding = 'md', className, children, ...rest }: CardSectionProps) => (
  <div {...rest} className={cx('crewlet-card__body', `crewlet-card__body--p-${padding}`, className)}>
    {children}
  </div>
);

export type CardFooterVariant =
  /** Buttons, at the end of the row. */
  | 'actions'
  /** A quiet strip of facts: a count, a timestamp, a source. */
  | 'meta';

export interface CardFooterProps extends CardSectionProps {
  variant?: CardFooterVariant | undefined;
}

/*
 * `sm` rather than the body's `md`: a footer is a quiet strip, not a block of
 * content, so it takes the vertical-only step. The two slots differ in their
 * DEFAULT, never in what a step named on both of them means.
 */
const CardFooter = ({ variant = 'actions', padding = 'sm', className, children, ...rest }: CardFooterProps) => (
  <div
    {...rest}
    className={cx(
      'crewlet-card__footer',
      `crewlet-card__footer--${variant}`,
      `crewlet-card__footer--p-${padding}`,
      className,
    )}
  >
    {children}
  </div>
);

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Overrides the heading element. By default the title takes the level the
   * surrounding surface declares, so the same card is an `h3` under a section
   * heading and an `h2` at the top of a page.
   */
  as?: `h${HeadingLevel}` | undefined;
  /**
   * A title with nowhere left to go ENDS in an ellipsis rather than being cut.
   *
   * The head is one line and the name block clips, so a title longer than the
   * row is stopped at the header's edge — mid-word, with nothing to say a word
   * was lost. `text-overflow` is the answer to that and it applies to a BLOCK
   * container only, never to a flex one, and the title is flex: the text
   * inside it is an anonymous flex item that no rule in this stylesheet can
   * reach. So the ellipsis is a change of the title's own display, which is a
   * change to what a caller's own children do inside it, which is why it is
   * asked for rather than assumed.
   *
   * OFF BY DEFAULT, because it is not free: a truncating title lays its
   * children out as one line of inline content instead of as centred,
   * gap-separated flex items, so a caller who put a glyph or a tag inside the
   * title gets it on the text baseline with no gap. `Card.Header`'s own `icon`
   * slot is where a glyph belongs, and it is outside the title and unaffected.
   * A title of plain text — which is every title in this package and every one
   * in the engine dashboard — reads identically either way, and is exactly the
   * case that was being cut.
   */
  truncate?: boolean | undefined;
}

const CardTitle = ({ as, truncate = false, className, children, ...rest }: CardTitleProps) => {
  const card = useContext(CardContext);
  const fallback = useHeadingLevel();
  const Tag = as ?? headingTag(card?.titleLevel ?? fallback);
  const register = card?.registerTitle;
  // On mount, so a sectioning card learns it has a name to point at. In an
  // effect rather than in render, because it sets state on the card above it.
  useEffect(() => {
    register?.();
  }, [register]);
  return (
    <Tag
      {...rest}
      id={rest.id ?? card?.titleId}
      className={cx('crewlet-card__title', truncate && 'crewlet-card__title--truncate', className)}
    >
      {children}
    </Tag>
  );
};

const CardDescription = ({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) => (
  <p {...rest} className={cx('crewlet-card__description', className)}>
    {children}
  </p>
);

/*
 * The slots, by identity rather than by name: `slotsIn` asks whether a child
 * IS one of these, so a caller cannot trip the flush recipe, or lend a table
 * the header row, with a div that happens to carry the same class.
 */
const SLOT_TYPES = new Set<object>([CardHeader, CardBody, CardFooter]);

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Title: CardTitle,
  Description: CardDescription,
});
