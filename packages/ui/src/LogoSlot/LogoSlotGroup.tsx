import { createContext, useContext, useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** What a slot inside a group needs: the shared caption it is described by. */
interface LogoSlotGroupContextValue {
  hintId: string | undefined;
}

const LogoSlotGroupContext = createContext<LogoSlotGroupContextValue | null>(null);

/** The group a slot stands in, or null for a slot on its own. */
export function useLogoSlotGroup(): LogoSlotGroupContextValue | null {
  return useContext(LogoSlotGroupContext);
}

export interface LogoSlotGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The slots, side by side: `LogoSlot`s. */
  children: ReactNode;
  /** Names the group for a screen reader: "Logos". */
  label?: string | undefined;
  /**
   * What may be brought, written once under the row rather than under every
   * slot: "SVG up to 512 KB; PNG or WebP up to 2 MB and 4096 px." Every slot's
   * picker is described by it. Left out, no caption is drawn.
   */
  hint?: ReactNode;
}

/**
 * Logo slots side by side, aligned row by row.
 *
 * ONE ROW PER PART ACROSS THE SLOTS. Each slot is a subgrid of the group's
 * rows, so the names and their descriptions, the stages, the notes under them
 * and the action rows each start on one line across every slot, whatever the
 * copy in each: a description that wraps to two lines moves every stage down
 * together rather than its own. The stages are one height, so the previews
 * are one size.
 *
 * THE CAPTION IS WRITTEN ONCE. What may be brought is the same for every
 * slot, so it is drawn once under the row (`hint`) and each picker is
 * described by it, rather than repeated three times.
 *
 * THE COLUMNS FOLLOW THE ROOM: as many as fit at 14rem each, then one under
 * another on a phone, each still aligned within itself.
 */
export function LogoSlotGroup({ children, label, hint, className, ...rest }: LogoSlotGroupProps) {
  const id = useId();
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const hintId = hasHint ? `${id}-hint` : undefined;
  return (
    <LogoSlotGroupContext.Provider value={{ hintId }}>
      <div {...rest} role="group" aria-label={label} className={cx('crewlet-logo-slot-group', className)}>
        <div className="crewlet-logo-slot-group__slots">{children}</div>
        {hasHint ? (
          <p id={hintId} className="crewlet-logo-slot-group__hint">
            {hint}
          </p>
        ) : null}
      </div>
    </LogoSlotGroupContext.Provider>
  );
}
