import {
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
} from 'react';
import { Avatar, type AvatarShape } from '../Avatar/Avatar.js';

// Omit the DOM "onSelect" event handler so it does not clash with the
// file-selection callback below, which carries a different signature.
export interface ImageUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Current image source. When set, the control shows the image and the overlay label reads "Change". */
  src?: string | undefined;
  /** Display name used for the initials fallback when no image is set. */
  name?: string | undefined;
  /** Rendered width and height in pixels. */
  size?: number | undefined;
  /** Outline shape passed through to the preview and fallback. Defaults to "circle". */
  shape?: AvatarShape | undefined;
  /** When true, the control is display only: no overlay, no remove button, no file picker. */
  readOnly?: boolean | undefined;
  /** When true, the control shows a spinner and ignores interaction while an upload is in flight. */
  uploading?: boolean | undefined;
  /** Accepted file types for the hidden file input. Defaults to "image/*". */
  accept?: string | undefined;
  /** Called with the raw selected File. The upload happens over the network, so no client-side encoding is performed. */
  onSelect: (file: File) => void;
  /** Called when the remove button is pressed. The button only renders when an image is set and the control is editable. */
  onRemove?: (() => void) | undefined;
}

/**
 * ImageUpload, a click-to-upload affordance built on top of Avatar. Shows the
 * current image (or an initials fallback), an overlay with a camera icon and
 * an "Upload" or "Change" label (shown on hover, or always while no image is
 * set), a hidden file input, a remove button, and an uploading state. One
 * primitive covers both square logos and round profile pictures.
 *
 * The selection callback hands back the raw File rather than a data URL because
 * the upload now happens over the network.
 */
export const ImageUpload = ({
  src,
  name,
  size = 64,
  shape = 'circle',
  readOnly = false,
  uploading = false,
  accept = 'image/*',
  onSelect,
  onRemove,
  className = '',
  style,
  ...rest
}: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const interactive = !readOnly && !uploading;
  const canRemove = Boolean(src) && !readOnly && Boolean(onRemove);

  const openPicker = () => {
    if (!interactive) {
      return;
    }
    inputRef.current?.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the value so selecting the same file again still fires onChange.
    event.target.value = '';
    if (file) {
      onSelect(file);
    }
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove?.();
  };

  // With nothing uploaded yet the overlay is the whole affordance, so it
  // stays visible instead of waiting for a hover: an initials tile on its
  // own does not say "put your logo here".
  const empty = !src && !readOnly;

  const wrapperClasses = [
    'crewlet-image-upload',
    `crewlet-image-upload--${shape}`,
    uploading ? 'is-uploading' : '',
    empty ? 'is-empty' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sizeStyle = {
    '--crewlet-image-upload-size': `${size}px`,
    ...style,
  } as CSSProperties;

  const triggerLabel = uploading
    ? 'Uploading image'
    : src
      ? 'Change image'
      : 'Upload image';

  return (
    <div {...rest} className={wrapperClasses} style={sizeStyle}>
      <button
        type="button"
        className="crewlet-image-upload__trigger"
        onClick={openPicker}
        disabled={!interactive}
        aria-label={triggerLabel}
        aria-busy={uploading}
      >
        <Avatar src={src} name={name} size={size} shape={shape} />
        {!readOnly ? (
          <span className="crewlet-image-upload__overlay" aria-hidden>
            {uploading ? (
              <span className="crewlet-image-upload__spinner" />
            ) : (
              <>
                <span className="material-symbols-outlined">photo_camera</span>
                <span className="crewlet-image-upload__overlay-text">
                  {src ? 'Change' : 'Upload'}
                </span>
              </>
            )}
          </span>
        ) : null}
      </button>

      {canRemove ? (
        <button
          type="button"
          className="crewlet-image-upload__remove"
          onClick={handleRemove}
          disabled={uploading}
          aria-label="Remove image"
        >
          <span className="material-symbols-outlined" aria-hidden>
            close
          </span>
        </button>
      ) : null}

      {!readOnly ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="crewlet-image-upload__input"
          onChange={handleChange}
          tabIndex={-1}
        />
      ) : null}
    </div>
  );
};
