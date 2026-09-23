import { Children, cloneElement, isValidElement, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Avatar, type AvatarKind, type AvatarSizeStep } from '../Avatar/index.js';
import { cx } from '../utils/cx.js';

export interface EntityChipProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Who or what this is. Drawn as initials and read as the chip's own text. */
  name: string;
  /** Where it goes. With neither this nor `asChild` the chip is inert text. */
  href?: string | undefined;
  /**
   * Render the single child element as the chip instead of an anchor, to put
   * this look on a router's own Link while keeping its navigation.
   */
  asChild?: boolean | undefined;
  /**
   * Whether the engine runs this one: an `agent` (the default) is drawn as a
   * squircle, a `human` seat as a circle, which is `Avatar`'s own kind. That is
   * structure rather than status, so it is carried by the outline rather than
   * by a hue and the state hues keep meaning only what they mean.
   */
  kind?: AvatarKind | undefined;
  /** The badge's step. The name takes the surrounding text size either way. */
  size?: AvatarSizeStep | undefined;
  children?: ReactNode;
}

/**
 * A name with its badge, as one thing.
 *
 * IT IS NOT DRAWN IN THE ACCENT, and that is the rule the component exists to
 * hold. A seat's name is IDENTITY, and the accent means "where the reader is";
 * a name rendered in the accent at every place it appears is identity-colouring
 * by accident, and it leaves the one thing on the page that IS the reader's
 * position indistinguishable from forty links that are not. The affordance is
 * the hover and the cursor, which is what a whole-row link has anyway.
 *
 * The badge is DECORATIVE here: the name is printed right beside it, and a
 * badge that was also read would make every row say the name twice.
 */
export function EntityChip({
  name,
  href,
  asChild = false,
  kind = 'agent',
  size = 'sm',
  className,
  children,
  ...rest
}: EntityChipProps) {
  const classes = cx('crewlet-entity-chip', href !== undefined || asChild ? 'crewlet-entity-chip--link' : null, className);

  const inner = (
    <>
      <Avatar name={name} size={size} kind={kind} decorative />
      <span className="crewlet-entity-chip__name">{name}</span>
    </>
  );

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('EntityChip with asChild expects exactly one valid React element child.');
    }
    const element = child as ReactElement<Record<string, unknown>>;
    return cloneElement(element, { ...rest, className: cx(element.props['className'] as string | undefined, classes) }, inner);
  }

  if (href !== undefined) {
    return (
      <a {...rest} className={classes} href={href}>
        {inner}
      </a>
    );
  }

  return (
    <span {...rest} className={classes}>
      {inner}
    </span>
  );
}
