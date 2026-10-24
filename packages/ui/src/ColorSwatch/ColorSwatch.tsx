import type { CSSProperties, ReactNode } from 'react';
import { Copyable } from '../Copyable/index.js';
import { cx } from '../utils/cx.js';
import { normalizeHex } from '../utils/hexColour.js';

export interface ColorSwatchLabels {
  /** Names the copy control: "Copy the Primary colour". */
  copy: (name: string) => string;
  /** Read out once the value is on the clipboard: "#5b3df5 copied to the clipboard". */
  copied: (hex: string) => string;
  /** Read out when the browser refused the clipboard. */
  failed: string;
  /** Printed in the value's place for a role with no colour. */
  empty: string;
}

const LABELS: ColorSwatchLabels = {
  copy: (name) => `Copy the ${name} colour`,
  copied: (hex) => `${hex} copied to the clipboard`,
  failed: 'The browser refused the clipboard',
  empty: 'Not set',
};

export type ColorSwatchSize = 'md' | 'sm';

export interface ColorSwatchProps {
  /** The colour's role: "Primary", "Dark ground". */
  name: string;
  /**
   * The colour, as `#rrggbb`. Anything else (an empty role, a value that is
   * not one) draws the hatch of no colour and says `empty`, and is never put
   * into a style.
   */
  value: string | null | undefined;
  /** What the role is used for: "Links, buttons and accents". */
  description?: ReactNode;
  /** A copy control beside the value. On by default: a reader takes the value to use elsewhere. */
  copyable?: boolean | undefined;
  /** `sm` is a row of chips beside a name, for a dense list. */
  size?: ColorSwatchSize | undefined;
  className?: string | undefined;
  labels?: Partial<ColorSwatchLabels> | undefined;
}

/**
 * One colour of a brand: a chip of it, its role, its value, and a control that
 * copies the value and says whether it landed.
 *
 * THE VALUE IS PRINTED, so the chip is decoration: a reader who cannot tell
 * two chips apart still reads two values. The value is drawn through one
 * custom property, and only after it has passed `#rrggbb`, so a colour typed
 * by a person never reaches a stylesheet as anything but a colour.
 *
 * THE CHIP HAS AN EDGE OF ITS OWN, so a colour that matches the page (white on
 * a light theme, near black on a dark one) is still a chip.
 */
export function ColorSwatch({
  name,
  value,
  description,
  copyable = true,
  size = 'md',
  className,
  labels,
}: ColorSwatchProps) {
  const text = { ...LABELS, ...labels };
  const hex = normalizeHex(value);
  const chip = hex ? ({ '--crewlet-color-swatch-value': hex } as CSSProperties) : undefined;
  return (
    <div className={cx('crewlet-color-swatch', `crewlet-color-swatch--${size}`, className)}>
      <span className={cx('crewlet-color-swatch__chip', !hex && 'is-empty')} style={chip} aria-hidden="true" />
      <span className="crewlet-color-swatch__words">
        <span className="crewlet-color-swatch__name">{name}</span>
        {description ? <span className="crewlet-color-swatch__description">{description}</span> : null}
        {hex ? (
          copyable ? (
            <Copyable
              variant="inline"
              monospace
              value={hex}
              ariaLabel={text.copy(name)}
              title={text.copy(name)}
              copiedMessage={text.copied(hex)}
              failedMessage={text.failed}
              failedResetMs={null}
              className="crewlet-color-swatch__value"
            />
          ) : (
            <span className="crewlet-color-swatch__value crewlet-color-swatch__value--plain">{hex}</span>
          )
        ) : (
          <span className="crewlet-color-swatch__empty">{text.empty}</span>
        )}
      </span>
    </div>
  );
}
