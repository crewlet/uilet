import type { RefObject } from 'react';
import { MaximizeGlyph, MinimizeGlyph } from '@crewlethq/icons/glyphs';
import { IconButton, type IconButtonSize } from '../IconButton/index.js';
import { useFullscreen } from './useFullscreen.js';

/** The control's two names, for another language. */
export interface FullscreenToggleLabels {
  enter: string;
  leave: string;
}

export const FULLSCREEN_TOGGLE_LABELS: FullscreenToggleLabels = {
  enter: 'Fullscreen',
  leave: 'Leave fullscreen',
};

export interface FullscreenToggleProps {
  /** The element taken fullscreen: the surface with everything it opens, since a fullscreen element paints only its own subtree. */
  target: RefObject<HTMLElement | null>;
  size?: IconButtonSize | undefined;
  labels?: Partial<FullscreenToggleLabels> | undefined;
  className?: string | undefined;
}

/**
 * The control that takes a surface fullscreen and gives it back, for a bar
 * that acts on that surface (a canvas's `controlsExtra`). It is not drawn
 * where the browser has no fullscreen, rather than drawn and failing.
 */
export function FullscreenToggle({ target, size = 'sm', labels, className }: FullscreenToggleProps) {
  const fullscreen = useFullscreen(target);
  if (!fullscreen.supported) return null;
  const text = { ...FULLSCREEN_TOGGLE_LABELS, ...labels };
  return (
    <IconButton
      label={fullscreen.active ? text.leave : text.enter}
      icon={fullscreen.active ? <MinimizeGlyph /> : <MaximizeGlyph />}
      size={size}
      className={className}
      onClick={fullscreen.toggle}
    />
  );
}
