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

export type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** 'single' opens one item at a time; 'multiple' allows many. Defaults to 'single'. */
  type?: AccordionType;
  /** For type="single": allow closing the open item by activating it again. Defaults to true. */
  collapsible?: boolean;
  /** Uncontrolled initial open item(s). */
  defaultValue?: string | string[];
  /** Controlled open item(s). */
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
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
  className = '',
  children,
  ...rest
}: AccordionProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string[]>(() => toArray(defaultValue));
  const open = isControlled ? toArray(value) : internal;

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

  const ctx = useMemo<AccordionContextValue>(() => ({ isOpen, toggle }), [isOpen, toggle]);
  const classes = ['crewlet-accordion', className].filter(Boolean).join(' ');

  return (
    <AccordionContext.Provider value={ctx}>
      <div {...rest} className={classes}>
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
  disabled?: boolean;
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

  const classes = [
    'crewlet-accordion__item',
    open ? 'is-open' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...rest} className={classes} data-state={open ? 'open' : 'closed'}>
      <h3 className="crewlet-accordion__heading">
        <button
          type="button"
          id={triggerId}
          className="crewlet-accordion__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => ctx.toggle(value)}
          onKeyDown={onKeyDown}
        >
          <span className="crewlet-accordion__title">{title}</span>
          <span className="crewlet-accordion__icon material-symbols-outlined" aria-hidden>
            expand_more
          </span>
        </button>
      </h3>
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
