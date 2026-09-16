import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx.js';
import { useHeadingLevel } from '../utils/headingLevel.js';
import { DisclosureAnatomy, type DisclosureHeadingLevel } from '../Disclosure/anatomy.js';

export type AccordionType = 'single' | 'multiple';
export type AccordionDensity = 'default' | 'compact';
export type AccordionAppearance =
  /** The stack draws its own hairlines, top and bottom. */
  | 'default'
  /**
   * NO FRAME OF ITS OWN, so the stack can be a Card's contents: the card's
   * border is the frame, the trigger is the card's identity row, and the
   * `actions` slot sits in that row outside the button.
   */
  | 'card';

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  headingLevel: DisclosureHeadingLevel;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** 'single' opens one item at a time; 'multiple' allows many. Defaults to 'single'. */
  type?: AccordionType | undefined;
  /** For type="single": allow closing the open item by activating it again. Defaults to true. */
  collapsible?: boolean | undefined;
  /** Uncontrolled initial open item(s). */
  defaultValue?: string | string[] | undefined;
  /** Controlled open item(s). */
  value?: string | string[] | undefined;
  onValueChange?: ((value: string | string[]) => void) | undefined;
  /** Tightens the rows for a settings stack rather than a marketing FAQ. */
  density?: AccordionDensity | undefined;
  appearance?: AccordionAppearance | undefined;
  /**
   * The heading each item's trigger is wrapped in. Defaults to the level the
   * surrounding surface declares, so the same stack is an `h3` under a section
   * heading and an `h2` inside a dialog whose title is the `h1` of everything
   * below it. `none` leaves the buttons unwrapped.
   */
  headingLevel?: DisclosureHeadingLevel | undefined;
}

const toArray = (input: string | string[] | undefined): string[] => {
  if (input === undefined) return [];
  return Array.isArray(input) ? input : [input];
};

const AccordionRoot = ({
  type = 'single',
  collapsible = true,
  defaultValue,
  value,
  onValueChange,
  density = 'default',
  appearance = 'default',
  headingLevel,
  className = '',
  children,
  ...rest
}: AccordionProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string[]>(() => toArray(defaultValue));
  const open = isControlled ? toArray(value) : internal;
  const level = useHeadingLevel();
  const resolvedLevel = headingLevel ?? level;

  const commit = useCallback(
    (next: string[]) => {
      if (!isControlled) setInternal(next);
      if (onValueChange) onValueChange(type === 'single' ? (next[0] ?? '') : next);
    },
    [isControlled, onValueChange, type],
  );

  const isOpen = useCallback((item: string) => open.includes(item), [open]);

  const toggle = useCallback(
    (item: string) => {
      const currentlyOpen = open.includes(item);
      if (type === 'single') {
        if (currentlyOpen) commit(collapsible ? [] : [item]);
        else commit([item]);
        return;
      }
      commit(currentlyOpen ? open.filter((entry) => entry !== item) : [...open, item]);
    },
    [open, type, collapsible, commit],
  );

  const ctx = useMemo<AccordionContextValue>(
    () => ({ isOpen, toggle, headingLevel: resolvedLevel }),
    [isOpen, toggle, resolvedLevel],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div
        {...rest}
        className={cx(
          'crewlet-accordion',
          `crewlet-accordion--${appearance}`,
          density === 'compact' && 'crewlet-accordion--compact',
          className,
        )}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Stable identifier for this item, used to track its open state. */
  value: string;
  /** The always-visible header content. */
  title: ReactNode;
  /** A fact inside the trigger: a duration, a status word, a model. */
  meta?: ReactNode;
  /** How many of something this item holds. */
  count?: number | string | undefined;
  /** Sets the title in the mono face: a tool name, a config path. */
  mono?: boolean | undefined;
  /** Controls beside the trigger, outside the button. */
  actions?: ReactNode;
  disabled?: boolean | undefined;
}

const moveFocus = (
  current: HTMLElement,
  direction: 'next' | 'prev' | 'first' | 'last',
): void => {
  const root = current.closest('.crewlet-accordion');
  if (!root) return;
  const triggers = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.crewlet-accordion__trigger:not([disabled])'),
  );
  if (triggers.length === 0) return;
  const index = triggers.indexOf(current as HTMLButtonElement);
  const target =
    direction === 'next'
      ? triggers[(index + 1) % triggers.length]
      : direction === 'prev'
        ? triggers[(index - 1 + triggers.length) % triggers.length]
        : direction === 'first'
          ? triggers[0]
          : triggers[triggers.length - 1];
  target?.focus();
};

const AccordionItem = ({
  value,
  title,
  meta,
  count,
  mono,
  actions,
  disabled = false,
  className = '',
  children,
  ...rest
}: AccordionItemProps) => {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error('AccordionItem must be rendered inside an Accordion.');
  }

  const open = ctx.isOpen(value);
  const rid = useId();
  const triggerId = `${rid}-trigger`;
  const panelId = `${rid}-panel`;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(event.currentTarget, 'next');
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(event.currentTarget, 'prev');
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(event.currentTarget, 'first');
        break;
      case 'End':
        event.preventDefault();
        moveFocus(event.currentTarget, 'last');
        break;
      default:
        break;
    }
  };

  return (
    <div
      {...rest}
      className={cx('crewlet-accordion__item', open && 'is-open', disabled && 'is-disabled', className)}
      data-state={open ? 'open' : 'closed'}
    >
      <DisclosureAnatomy
        open={open}
        onToggle={() => ctx.toggle(value)}
        title={title}
        meta={meta}
        count={count}
        mono={mono}
        actions={actions}
        disabled={disabled}
        headingLevel={ctx.headingLevel}
        triggerId={triggerId}
        panelId={panelId}
        /*
         * BOTH classes. The anatomy states the look once for every expander in
         * the package, and this one keeps the name a consumer stylesheet and
         * the roving-focus query above already select on.
         */
        triggerClassName="crewlet-accordion__trigger"
        onKeyDown={onKeyDown}
      />
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className="crewlet-accordion__panel"
        hidden={!open}
      >
        <div className="crewlet-accordion__panel-inner">{children}</div>
      </div>
    </div>
  );
};

export const Accordion = Object.assign(AccordionRoot, { Item: AccordionItem });
export { AccordionItem };
