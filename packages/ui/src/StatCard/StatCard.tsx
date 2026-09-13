import type { HTMLAttributes, ReactNode } from 'react';

export type StatCardTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Metric label, for example "Total Tokens". */
  label: ReactNode;
  /** The headline value, already formatted by the caller. */
  value: ReactNode;
  /** Optional secondary line under the label, for example "3 working, 4 idle". */
  sub?: ReactNode;
  /** Optional leading icon (Material symbol, Icon, or any node). */
  icon?: ReactNode;
  /** Tints the icon and value accent. Defaults to neutral. */
  tone?: StatCardTone;
  /** Renders a loading placeholder instead of the value. */
  loading?: boolean;
}

/**
 * StatCard, a compact key-metric tile for dashboards and rollup
 * headers: one value, one label, an optional sub-line and icon.
 */
export const StatCard = ({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
  loading = false,
  className = '',
  ...rest
}: StatCardProps) => {
  const classes = ['crewlet-statcard', `crewlet-statcard--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...rest} className={classes}>
      {icon ? <span className="crewlet-statcard__icon" aria-hidden>{icon}</span> : null}
      <div className="crewlet-statcard__body">
        <div className="crewlet-statcard__value">
          {loading ? <span className="crewlet-statcard__placeholder">--</span> : value}
        </div>
        <div className="crewlet-statcard__label">{label}</div>
        {sub ? <div className="crewlet-statcard__sub">{sub}</div> : null}
      </div>
    </div>
  );
};
