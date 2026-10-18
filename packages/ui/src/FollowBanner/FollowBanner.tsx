import { useEffect } from 'react';
import { EyeGlyph, UserGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import { isComposing } from '../Layer/index.js';
import { cx } from '../utils/cx.js';

/** Following somebody, or the moment they left and following stopped. */
export type FollowBannerState = 'following' | 'left';

export interface FollowBannerLabels {
  following: (name: string) => string;
  left: (name: string) => string;
  stop: string;
  dismiss: string;
}

const LABELS: FollowBannerLabels = {
  following: (name) => `Following ${name}. Press Esc or scroll to stop.`,
  left: (name) => `${name} left. You stopped following.`,
  stop: 'Stop following',
  dismiss: 'Dismiss',
};

export interface FollowBannerProps {
  /** The followed collaborator's full name in the sentence: "Maya Ortiz", or the first name once they left. */
  name: string;
  state?: FollowBannerState | undefined;
  /** Stop following: the Stop control, or Escape anywhere in the document while following. */
  onStop: () => void;
  /** Takes the banner down once it has said the followed person left. */
  onDismiss?: (() => void) | undefined;
  className?: string | undefined;
  labels?: Partial<FollowBannerLabels> | undefined;
}

/**
 * The strip across the top of an artifact while its reader follows somebody:
 * the view moves with theirs (tab, version, scroll, active cell) until the
 * reader takes it back.
 *
 * ESCAPE STOPS IT FROM ANYWHERE, because following moves the reader's view
 * under them and the way out has to be one key wherever focus happens to be.
 * A key a composition is using, and one a nearer surface (an open menu, a
 * dialog) already handled, are left alone. Scrolling or any own move of the
 * view stops it too; that is the host's to call `onStop` for, since only the
 * host knows which scroll is the reader's and which is the follow.
 *
 * ANNOUNCED POLITELY when it appears and when its sentence changes, so a
 * screen reader user is told they are following and told when it stopped.
 */
export function FollowBanner({ name, state = 'following', onStop, onDismiss, className, labels }: FollowBannerProps) {
  const text = { ...LABELS, ...labels };
  const following = state === 'following';

  useEffect(() => {
    if (!following) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isComposing(event)) return;
      onStop();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [following, onStop]);

  return (
    <Callout
      layout="banner"
      live="polite"
      icon={following ? <EyeGlyph size="md" /> : <UserGlyph size="md" />}
      className={cx('crewlet-follow-banner', className)}
      action={
        following ? (
          <Button size="small" variant="secondary" onClick={onStop}>
            {text.stop}
          </Button>
        ) : onDismiss ? (
          <Button size="small" variant="ghost" onClick={onDismiss}>
            {text.dismiss}
          </Button>
        ) : undefined
      }
    >
      {following ? text.following(name) : text.left(name)}
    </Callout>
  );
}
