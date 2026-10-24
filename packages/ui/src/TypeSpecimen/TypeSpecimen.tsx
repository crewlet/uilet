import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { fontStack, safeFontFamily } from '../utils/fontFamily.js';

export interface TypeSpecimenLabels {
  /** The large letters the face is shown in. */
  glyphs: string;
  /** The line the face is read in, when the host gives none. */
  sample: string;
}

const LABELS: TypeSpecimenLabels = {
  glyphs: 'Aa',
  sample: 'Every doc, deck and page your company makes, in its own type.',
};

export type TypeSpecimenSize = 'md' | 'sm';

export interface TypeSpecimenProps {
  /** The face's name, as a reader knows it: "Geist", "Inter Display". */
  family: string;
  /**
   * What the face is for, printed over its name: "Heading", "Body". Named
   * `label` rather than `role`, which is the ARIA attribute's name.
   */
  label: string;
  /**
   * The CSS family list to draw it in, when it is not the face's name alone:
   * a system stack, or the family an uploaded face was declared under. Left
   * out, or not a list of family names, the name is drawn in quotes before the
   * package's own sans, so a face this page has not loaded falls back to a
   * face it has.
   */
  fontFamily?: string | undefined;
  /** The line the face is read in. */
  sample?: string | undefined;
  /** One fact under the name: "Uploaded, 4 files", "System stack". */
  detail?: ReactNode;
  /** The weight the specimen draws: a heading's face is shown at a heading's weight. */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | undefined;
  size?: TypeSpecimenSize | undefined;
  className?: string | undefined;
  labels?: Partial<TypeSpecimenLabels> | undefined;
}

/** A face's name as a CSS family, quotes, back slashes and line breaks taken out so it stays one quoted name. */
function quotedFamily(family: string): string {
  return `"${family.replace(/["\\\r\n]/g, '').trim()}"`;
}

/**
 * A face, shown: what it is for, "Aa" large in it, its name, and a line read
 * in it.
 *
 * THE FACE IS DRAWN, NOT DESCRIBED. The letters and the line are set in the
 * face itself (through `--crewlet-type-specimen-family`), so choosing a face
 * is choosing what it looks like rather than a name. The name and the role
 * are set in the interface's own type, so they read the same whatever the face
 * is.
 *
 * A FACE THE PAGE CANNOT DRAW FALLS BACK TO ONE IT CAN: the family list ends
 * in the package's sans, so a face still loading (or never uploaded) shows as
 * the interface's type rather than as the browser's default serif.
 */
export function TypeSpecimen({
  family,
  label,
  fontFamily,
  sample,
  detail,
  weight = 'regular',
  size = 'md',
  className,
  labels,
}: TypeSpecimenProps) {
  const text = { ...LABELS, ...labels };
  const stack = fontStack(safeFontFamily(fontFamily) ?? quotedFamily(family), 'var(--font-family-sans)');
  return (
    <figure
      className={cx('crewlet-type-specimen', `crewlet-type-specimen--${size}`, `crewlet-type-specimen--${weight}`, className)}
      style={{ '--crewlet-type-specimen-family': stack } as CSSProperties}
    >
      <figcaption className="crewlet-type-specimen__caption">
        <span className="crewlet-type-specimen__label">{label}</span>
        <span className="crewlet-type-specimen__family">{family}</span>
        {detail ? <span className="crewlet-type-specimen__detail">{detail}</span> : null}
      </figcaption>
      <span className="crewlet-type-specimen__glyphs" aria-hidden="true">
        {text.glyphs}
      </span>
      <span className="crewlet-type-specimen__sample">{sample ?? text.sample}</span>
    </figure>
  );
}
