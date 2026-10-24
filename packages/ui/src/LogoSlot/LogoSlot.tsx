import { useId, type CSSProperties, type ReactNode } from 'react';
import { CircleAlertGlyph, ImageGlyph, TrashGlyph, UploadGlyph } from '@crewlethq/icons/glyphs';
import { themes } from '@crewlethq/tokens';
import { Button } from '../Button/index.js';
import { contrastRatio } from '../ContrastBadge/index.js';
import { FileDrop, FilePickButton, type PickedFile } from '../FileDrop/index.js';
import { cx } from '../utils/cx.js';
import { normalizeHex } from '../utils/hexColour.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** The ground a logo is drawn on: the light one it is usually made for, or a dark one. */
export type LogoSlotGround = 'light' | 'dark';

/** A wide logo (a wordmark, a lockup) or a square mark. */
export type LogoSlotShape = 'wide' | 'square';

export interface LogoSlotLabels {
  /** The picker's label while the slot is empty. */
  choose: string;
  /** The picker's label once the slot holds a logo. */
  replace: string;
  remove: string;
  /** What the overlay says while a file is held over the slot. */
  drop: string;
  /** Said and shown while a file is uploading. */
  uploading: string;
  /** Printed under an empty slot for a reader who cannot fill it. */
  empty: string;
  /** What may be brought, under the picker. */
  hint: string;
}

const LABELS: LogoSlotLabels = {
  choose: 'Choose a file',
  replace: 'Replace',
  remove: 'Remove',
  drop: 'Drop the file to use it',
  uploading: 'Uploading',
  empty: 'No logo yet',
  hint: 'SVG, PNG or WebP, up to 2 MB.',
};

/*
 * THE GROUNDS WHEN THE BRAND HAS NONE OF ITS OWN: the light and the dark
 * palettes' own sheets, read from the tokens package, so a logo is shown on
 * the ground the product draws in each mode whatever mode the page is in.
 */
const DEFAULT_GROUNDS: Readonly<Record<LogoSlotGround, string>> = {
  light: themes.light.color.surface.background,
  dark: themes.dark.color.surface.background,
};

/* The two inks the slot can draw its guide and its placeholder in: each palette's secondary text. */
const INKS: readonly string[] = [themes.light.color.text.secondary, themes.dark.color.text.secondary];

/**
 * The ink that reads on a ground: of the two palettes' secondary text, the
 * one with more contrast on it, measured by the tokens package. A brand's
 * ground can be any colour, so the slot cannot assume which mode it is.
 */
function inkOn(ground: string): string {
  let best = INKS[0] as string;
  let most = -1;
  for (const ink of INKS) {
    const ratio = contrastRatio(ink, ground) ?? 0;
    if (ratio > most) {
      most = ratio;
      best = ink;
    }
  }
  return best;
}

export interface LogoSlotProps {
  /** The slot's name: "Primary", "For dark grounds", "Mark". */
  label: string;
  /** One line under it: "On a light ground". */
  description?: ReactNode;
  /** The ground the logo is drawn on. */
  ground: LogoSlotGround;
  /**
   * The brand's own colour for that ground, `#rrggbb`. Left out (or not a
   * colour), the slot draws the product's own ground for that mode.
   */
  groundColor?: string | undefined;
  shape?: LogoSlotShape | undefined;
  /**
   * The logo, as an address the host has already validated (the engine's file
   * route, through the dashboard's checked blob path). Empty, the slot shows
   * where a logo would go.
   */
  src?: string | null | undefined;
  /** What the logo says, for a reader who cannot see it: "Acme logo". */
  alt: string;
  /** The clear-space guide: a dashed line round the logo at the space it keeps. On by default. */
  guide?: boolean | undefined;
  /** A file is uploading: the picker spins and the slot takes no new file until it lands. */
  uploading?: boolean | undefined;
  /** Why the last file was refused, with what to do about it. Drawn under the slot and announced. */
  error?: ReactNode;
  /** The reader may change the logo: a picker, Remove, and dropping a file on the slot. */
  editable?: boolean | undefined;
  /** A file was picked or dropped. One file: a slot holds one logo. */
  onFile?: ((file: File) => void) | undefined;
  /** Remove was pressed. Offered only while the slot holds a logo. */
  onRemove?: (() => void) | undefined;
  /** The types the picker offers, as the input's `accept` takes them. The engine still checks every file. */
  accept?: string | undefined;
  /** A reader's action beside the slot's name: a download of the logo. */
  download?: ReactNode;
  /**
   * Said under an empty slot in place of `empty`: what an empty slot means
   * here ("The primary logo is used on dark grounds until one is added").
   */
  emptyNote?: ReactNode;
  className?: string | undefined;
  labels?: Partial<LogoSlotLabels> | undefined;
}

/**
 * One of a brand's logos, drawn on the ground it is made for, with the space
 * it keeps round it.
 *
 * ON ITS OWN GROUND, NOT THE PAGE'S. A logo for a light ground is shown on a
 * light ground in a dark theme too, and one for dark grounds on a dark one:
 * the brand's own ground colour when it has one, the product's sheet for that
 * mode when it has not. The guide and the placeholder are inked in whichever
 * of the two palettes' text reads better on that ground.
 *
 * THE CLEAR-SPACE GUIDE is a dashed line round the logo at the space it keeps,
 * so an administrator sees how it will sit in a header before it is in one.
 *
 * BRINGING A FILE IS NEVER ONLY A DROP. An editable slot carries a picker
 * (`FilePickButton`), and the slot itself is a `FileDrop` region for a pointer.
 * The engine checks every file; a refusal comes back as `error`, drawn under
 * the slot and announced, saying what to change.
 */
export function LogoSlot({
  label,
  description,
  ground,
  groundColor,
  shape = 'wide',
  src,
  alt,
  guide = true,
  uploading = false,
  error,
  editable = false,
  onFile,
  onRemove,
  accept = 'image/svg+xml,image/png,image/webp',
  download,
  emptyNote,
  className,
  labels,
}: LogoSlotProps) {
  const text = { ...LABELS, ...labels };
  const labelId = useId();
  const descriptionId = useId();
  const groundValue = normalizeHex(groundColor) ?? DEFAULT_GROUNDS[ground];
  const filled = Boolean(src);
  const take = (files: PickedFile[]) => {
    const first = files[0];
    if (first && !uploading) onFile?.(first.file);
  };

  const stage = (
    <div
      className={cx(
        'crewlet-logo-slot__stage',
        `crewlet-logo-slot__stage--${ground}`,
        `crewlet-logo-slot__stage--${shape}`,
        !filled && 'is-empty',
        uploading && 'is-uploading',
      )}
      style={{ '--crewlet-logo-slot-ground': groundValue, '--crewlet-logo-slot-ink': inkOn(groundValue) } as CSSProperties}
    >
      <span className={cx('crewlet-logo-slot__space', guide && 'has-guide')}>
        {filled ? (
          <img src={src ?? undefined} alt={alt} className="crewlet-logo-slot__image" draggable={false} />
        ) : (
          <span className="crewlet-logo-slot__placeholder" aria-hidden="true">
            <ImageGlyph size="lg" />
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={uploading || undefined}
      className={cx('crewlet-logo-slot', className)}
    >
      <div className="crewlet-logo-slot__head">
        <span className="crewlet-logo-slot__words">
          <span id={labelId} className="crewlet-logo-slot__label">
            {label}
          </span>
          {description ? (
            <span id={descriptionId} className="crewlet-logo-slot__description">
              {description}
            </span>
          ) : null}
        </span>
        {download && filled ? <span className="crewlet-logo-slot__download">{download}</span> : null}
      </div>
      {editable ? (
        <FileDrop title={text.drop} onFiles={take} disabled={uploading}>
          {stage}
        </FileDrop>
      ) : (
        stage
      )}
      {!filled && (!editable || emptyNote) ? (
        <p className="crewlet-logo-slot__empty">{emptyNote ?? text.empty}</p>
      ) : null}
      {error ? (
        <p className="crewlet-logo-slot__error" role="alert">
          <CircleAlertGlyph size="sm" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
      {editable ? (
        <div className="crewlet-logo-slot__foot">
          <FilePickButton
            size="small"
            variant="secondary"
            leadingIcon={<UploadGlyph size="sm" />}
            accept={accept}
            multiple={false}
            loading={uploading}
            aria-describedby={labelId}
            onFiles={take}
          >
            {filled ? text.replace : text.choose}
          </FilePickButton>
          {filled && onRemove ? (
            <Button
              size="small"
              variant="ghost"
              leadingIcon={<TrashGlyph size="sm" />}
              disabledReason={uploading ? text.uploading : undefined}
              aria-describedby={labelId}
              onClick={onRemove}
            >
              {text.remove}
            </Button>
          ) : null}
          <span className="crewlet-logo-slot__hint">{text.hint}</span>
        </div>
      ) : null}
      {/* SAID AS IT STARTS: the spinner on the picker is a picture of it. */}
      <VisuallyHidden>
        <span role="status">{uploading ? text.uploading : ''}</span>
      </VisuallyHidden>
    </div>
  );
}
