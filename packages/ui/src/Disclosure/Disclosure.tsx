import { useCallback, useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { useHeadingLevel } from '../utils/headingLevel.js';
import { DisclosureAnatomy, type DisclosureHeadingLevel } from './anatomy.js';

export type DisclosureVariant =
  /** A section of the page that happens to be folded. */
  | 'default'
  /**
   * An ASIDE: what was considered rather than what was decided. A rule down
   * its edge lets a reader skip the whole block by its shape rather than by
   * reading it.
   */
  | 'aside';

export type DisclosureSize = 'default' | 'compact';

export interface DisclosureProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onToggle'> {
  /** The always-visible words. */
  title: ReactNode;
  /** A fact inside the trigger: a duration, a model, a status word. */
  meta?: ReactNode;
  /** How many of something the section holds. */
  count?: number | string | undefined;
  /** Sets the title in the mono face. */
  mono?: boolean | undefined;
  /** Controls beside the trigger, outside the button. */
  actions?: ReactNode;
  /** Controlled open state. */
  open?: boolean | undefined;
  /** Uncontrolled initial state. */
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /**
   * Mount the children only while open. For a section whose content is
   * expensive: a syntax-highlighted record, a chart, a request nobody has
   * asked for. Closed again, the children unmount and their state goes with
   * them, which is the trade.
   */
  lazy?: boolean | undefined;
  variant?: DisclosureVariant | undefined;
  size?: DisclosureSize | undefined;
  /**
   * The heading the trigger is wrapped in. Defaults to the level the
   * surrounding surface declares, so the same section is an `h3` on a page
   * under an `h2` and an `h2` inside a dialog. `none` leaves the button
   * unwrapped, for a disclosure that is not a section of anything.
   */
  headingLevel?: DisclosureHeadingLevel | undefined;
  children?: ReactNode;
}

/**
 * A labelled section the reader opens.
 *
 * NOT A BARE `details`. That element draws the platform's own marker instead
 * of the chevron every other expander here uses, takes none of the hover,
 * inset or type of this one, and cannot carry a count, a fact or a set of
 * controls outside its summary. Two expanders that behave the same and look
 * different is the specific thing a component library exists to stop.
 */
export function Disclosure({
  title,
  meta,
  count,
  mono,
  actions,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  lazy = false,
  variant = 'default',
  size = 'default',
  headingLevel,
  className,
  children,
  ...rest
}: DisclosureProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolled;
  const level = useHeadingLevel();
  const rid = useId();

  const toggle = useCallback(() => {
    if (!controlled) setUncontrolled(!open);
    onOpenChange?.(!open);
  }, [controlled, onOpenChange, open]);

  return (
    <div
      {...rest}
      className={cx(
        'crewlet-disclosure',
        `crewlet-disclosure--${variant}`,
        size === 'compact' && 'crewlet-disclosure--compact',
        className,
      )}
      data-state={open ? 'open' : 'closed'}
    >
      <DisclosureAnatomy
        open={open}
        onToggle={toggle}
        title={title}
        meta={meta}
        count={count}
        mono={mono}
        actions={actions}
        headingLevel={headingLevel ?? level}
        triggerId={`${rid}-trigger`}
        panelId={`${rid}-panel`}
      />
      {/*
        `hidden` rather than an unmount, unless the caller asks for one. A
        panel removed from the tree loses whatever the reader had done inside
        it, a scroll position and a half-typed field included, and a section
        that is cheap to keep has no reason to.
      */}
      {lazy && !open ? null : (
        <div
          id={`${rid}-panel`}
          role="region"
          aria-labelledby={`${rid}-trigger`}
          className="crewlet-disclosure__panel"
          hidden={!open}
        >
          {children}
        </div>
      )}
    </div>
  );
}
