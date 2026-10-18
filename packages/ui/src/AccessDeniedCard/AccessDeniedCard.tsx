import type { ReactNode } from 'react';
import { EyeOffGlyph, LockGlyph, ShieldGlyph } from '@crewlethq/icons/glyphs';
import { Card } from '../Card/index.js';
import { EmptyState } from '../EmptyState/index.js';
import type { HeadingLevel } from '../utils/headingLevel.js';
import { cx } from '../utils/cx.js';

/**
 * Why an artifact cannot be shown.
 *
 * `not-found` is what the engine answers for an artifact the reader has no
 * relation to, as much as for one that does not exist: telling the two apart
 * would tell anybody holding a link that the artifact is there. So it says
 * both, and it says them together. `no-access` is for a reader the engine has
 * told plainly (a member of the company opening a private artifact through a
 * surface that already named it). `revoked` is access that ended while the
 * reader had it open. `app-locked` is a reader whose role does not open the
 * Artifacts app at all.
 */
export type AccessDeniedReason = 'not-found' | 'no-access' | 'revoked' | 'app-locked';

export const ACCESS_DENIED_REASONS = ['not-found', 'no-access', 'revoked', 'app-locked'] as const satisfies readonly AccessDeniedReason[];

export interface AccessDeniedCardLabels {
  titles: Record<AccessDeniedReason, string>;
  /** The line under the title, given the owner's name when the caller knows it. */
  descriptions: Record<AccessDeniedReason, (owner: string | undefined) => string>;
}

const LABELS: AccessDeniedCardLabels = {
  titles: {
    'not-found': 'This artifact does not exist, or it has not been shared with you',
    'no-access': 'You do not have access to this artifact',
    revoked: 'Your access to this artifact ended',
    'app-locked': 'Needs Artifacts access',
  },
  descriptions: {
    'not-found': () => 'Check the link, or ask whoever sent it to share the artifact with you.',
    'no-access': (owner) => (owner ? `Ask ${owner} to share it with you.` : 'Ask its owner to share it with you.'),
    revoked: (owner) =>
      owner
        ? `${owner} removed your access, or narrowed who can open it. Ask them if you still need it.`
        : 'Its owner removed your access, or narrowed who can open it. Ask them if you still need it.',
    'app-locked': () => 'Your role does not include Artifacts. Ask an administrator to give you access.',
  },
};

const GLYPHS: Record<AccessDeniedReason, ReactNode> = {
  'not-found': <EyeOffGlyph size={32} />,
  'no-access': <LockGlyph size={32} />,
  revoked: <LockGlyph size={32} />,
  'app-locked': <ShieldGlyph size={32} />,
};

export interface AccessDeniedCardProps {
  reason: AccessDeniedReason;
  /** The owner's name, where the reader is allowed to know it, so the request names a person. */
  owner?: string | undefined;
  /** What the reader can do next: "Back to artifacts", "Request access". */
  action?: ReactNode;
  headingLevel?: HeadingLevel | 'none' | undefined;
  className?: string | undefined;
  labels?: Partial<AccessDeniedCardLabels> | undefined;
}

/**
 * The card an artifact's place shows when the reader may not open it.
 *
 * IT SAYS WHAT THE READER CAN DO, never what the artifact is. A title, a
 * kind or an owner the engine has not shown this reader stays unsaid, so the
 * card is safe to draw from nothing but the engine's refusal.
 */
export function AccessDeniedCard({ reason, owner, action, headingLevel, className, labels }: AccessDeniedCardProps) {
  const text = {
    titles: { ...LABELS.titles, ...labels?.titles },
    descriptions: { ...LABELS.descriptions, ...labels?.descriptions },
  };
  return (
    <Card padding="lg" className={cx('crewlet-access-denied-card', className)} data-reason={reason}>
      <EmptyState
        icon={GLYPHS[reason]}
        title={text.titles[reason]}
        description={text.descriptions[reason](owner)}
        action={action}
        headingLevel={headingLevel}
      />
    </Card>
  );
}
