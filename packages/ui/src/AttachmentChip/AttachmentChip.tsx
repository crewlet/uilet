import { useState, type HTMLAttributes } from 'react';
import { CircleAlertGlyph, ImageGlyph } from '@crewlethq/icons/glyphs';
import { Spinner } from '../Spinner/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** Where an attached file stands: on its way up, ready to send, or refused. */
export type AttachmentChipState = 'uploading' | 'ready' | 'failed';

/** The words a state is said with after the file's name, for a screen reader. */
export interface AttachmentChipLabels {
  uploading: string;
  failed: string;
  /** Names the remove control, by the file's name. */
  remove: (name: string) => string;
}

export const ATTACHMENT_CHIP_LABELS: AttachmentChipLabels = {
  uploading: 'Uploading',
  failed: 'Not attached',
  remove: (name) => `Remove ${name}`,
};

export interface AttachmentChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The file's name. */
  name: string;
  /**
   * The address of an image to draw as the chip's thumbnail, or nothing for
   * the image mark. DRAWN ONLY AS AN `<img>`, so a picture never runs what it
   * carries; one that fails to load falls back to the mark.
   */
  preview?: string | undefined;
  state?: AttachmentChipState | undefined;
  /** Takes the file off what is being sent. Without it, the chip only shows what was sent. */
  onRemove?: (() => void) | undefined;
  labels?: Partial<AttachmentChipLabels> | undefined;
}

/**
 * A file attached to a message, as the chip in a composer's attachments row
 * and under the message it was sent with: a thumbnail, the file's name, and
 * a remove control while it can still be taken off.
 *
 * A `Tag`, SO IT STANDS IN ONE ROW with the other things a message carries
 * (the page a question is asked about) at the same height and in the same
 * outline. Uploading, the thumbnail gives way to the spinner; refused, the
 * chip takes the danger tone and the alert mark, and its state is said in
 * words after the name, because the mark is a picture of it.
 */
export function AttachmentChip({
  name,
  preview,
  state = 'ready',
  onRemove,
  labels: overrides,
  className,
  ...rest
}: AttachmentChipProps) {
  const labels = overrides ? { ...ATTACHMENT_CHIP_LABELS, ...overrides } : ATTACHMENT_CHIP_LABELS;
  const [broken, setBroken] = useState(false);
  const picture = preview !== undefined && preview !== '' && !broken;
  const mark =
    state === 'uploading' ? (
      <Spinner size="xs" />
    ) : state === 'failed' ? (
      <CircleAlertGlyph size="xs" />
    ) : picture ? (
      <img
        className="crewlet-attachment-chip__thumb"
        src={preview}
        alt=""
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setBroken(true)}
      />
    ) : (
      <ImageGlyph size="xs" />
    );
  const said = state === 'ready' ? '' : `, ${labels[state]}`;
  const common = {
    ...rest,
    className: cx('crewlet-attachment-chip', `crewlet-attachment-chip--${state}`, className),
    size: 'sm' as const,
    appearance: 'outline' as const,
    variant: state === 'failed' ? ('danger' as const) : ('neutral' as const),
    leadingIcon: mark,
    title: name,
  };
  const words = (
    <>
      {name}
      {said === '' ? null : <VisuallyHidden>{said}</VisuallyHidden>}
    </>
  );
  return onRemove === undefined ? (
    <Tag {...common}>{words}</Tag>
  ) : (
    <Tag {...common} onRemove={onRemove} removeAriaLabel={labels.remove(name)}>
      {words}
    </Tag>
  );
}
