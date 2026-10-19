import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { Count } from '../Count/index.js';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/** A surface's colour: one of the six hues, or none. */
export type SurfaceTone = NodeHue | 'none';

const PLACEHOLDER = 'Name this group';

/**
 * How a group is drawn.
 *
 * `band`, the default, is a bordered box whose header is a band in the tone,
 * for a page being arranged, where each group is an object to move.
 *
 * `section` is a quiet section of a page being read: the name, its count and
 * the chevron on the page's ground over a hairline (in the tone, where there
 * is one), and the blocks on the page's own grid with no inset, so a block in
 * the section lines up with the blocks outside it. A filled band among cards
 * outweighed every card on the page.
 */
export type ArrangeGroupVariant = 'band' | 'section';

export interface ArrangeGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** What the group holds, in the reader's words: "Delivery". */
  title: string;
  tone?: SurfaceTone | undefined;
  /** How the group is drawn: see the type. Defaults to `band`. */
  variant?: ArrangeGroupVariant | undefined;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** How many blocks it holds, beside the title. */
  count?: number | undefined;
  /** Editing, the title is a field. Left out, it is read only. */
  onTitleChange?: ((title: string) => void) | undefined;
  /** Props for the body the blocks are laid in (a drop target, a class). */
  bodyProps?: (HTMLAttributes<HTMLDivElement> & { 'data-reorder-over'?: string | undefined }) | undefined;
  /** Drawn in the body when it holds nothing. */
  empty?: ReactNode;
  /** Columns of the body's grid. */
  columns?: number | undefined;
  /** Controls at the end of the header. */
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * A titled band that holds blocks of a page, the way a dashboard groups its
 * widgets: "Needs attention", "Delivery", "Spend".
 *
 * A HEADING THAT FOLDS. The header is the group's name and the control that
 * collapses it, one button with `aria-expanded`, so a reader skimming the
 * page's outline finds every group and opens the one they want.
 *
 * ITS OWN GRID. The blocks inside are laid on the same column count as the
 * page, measured across the group, so a half-width card in a half-width group
 * is a quarter of the page and reads as half of its group.
 *
 * THE TONE IS A BAND, never the whole surface: the header carries the hue and
 * the body stays the page's, so the cards inside keep their own contrast.
 */
export function ArrangeGroup({
  title,
  tone = 'none',
  variant = 'band',
  collapsed,
  onCollapsedChange,
  count,
  onTitleChange,
  bodyProps,
  empty,
  columns = 12,
  actions,
  className,
  children,
  ...rest
}: ArrangeGroupProps) {
  const bodyId = `${useId()}-body`;
  const { className: bodyClass, style: bodyStyle, ...body } = bodyProps ?? {};
  const hasChildren = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <section
      className={cx(
        'crewlet-arrange-group',
        `crewlet-arrange-group--${tone}`,
        variant === 'section' && 'crewlet-arrange-group--section',
        collapsed && 'is-collapsed',
        className,
      )}
      aria-label={title || 'Untitled group'}
      {...rest}
    >
      <header className="crewlet-arrange-group__head">
        <button
          type="button"
          className={cx('crewlet-arrange-group__toggle', onTitleChange && 'is-icon')}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={onTitleChange ? `${collapsed ? 'Expand' : 'Collapse'} ${title || 'group'}` : undefined}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronDownGlyph size="sm" className="crewlet-arrange-group__chevron" />
          {onTitleChange ? null : <span className="crewlet-arrange-group__title">{title || 'Untitled group'}</span>}
        </button>
        {onTitleChange ? (
          <input
            className="crewlet-arrange-group__title-field"
            aria-label="Group name"
            value={title}
            maxLength={60}
            placeholder={PLACEHOLDER}
            // The width in characters where field-sizing is not supported.
            size={Math.max(3, (title || PLACEHOLDER).length)}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        ) : null}
        {count !== undefined ? <Count value={count} className="crewlet-arrange-group__count" /> : null}
        {actions ? <span className="crewlet-arrange-group__actions">{actions}</span> : null}
      </header>
      <div
        id={bodyId}
        className={cx('crewlet-arrange-grid', 'crewlet-arrange-group__body', bodyClass)}
        style={{ ...bodyStyle, ['--crewlet-arrange-columns' as string]: columns }}
        hidden={collapsed}
        {...body}
      >
        {hasChildren ? children : empty ? <div className="crewlet-arrange-group__empty">{empty}</div> : null}
      </div>
    </section>
  );
}
