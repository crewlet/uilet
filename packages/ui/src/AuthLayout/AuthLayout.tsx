import { useId, type ReactNode } from 'react';
import { CrewletIcon } from '@crewlethq/icons';
import { BrandLockup } from '../BrandLockup/index.js';
import { Card } from '../Card/index.js';
import { cx } from '../utils/cx.js';

export interface AuthLayoutProps {
  /** What this screen is: "Sign in", "Set your password". The page's one `h1`. */
  title: ReactNode;
  /** One or two sentences under the title saying what the screen is for. */
  description?: ReactNode;
  /** The product's name beside its mark. */
  productName?: string | undefined;
  /** The mark. Defaults to the Crewlet mark; decoration, since the name says it. */
  mark?: ReactNode;
  /** Home, for a screen a reader can leave. Without it the lockup is not a link. */
  homeHref?: string | undefined;
  /** The form, or the message and its one action. */
  children?: ReactNode;
  className?: string | undefined;
}

/**
 * The page a sign-in screen is drawn on: the product's lockup, and one card.
 *
 * OUTSIDE THE APPLICATION SHELL, deliberately. A browser here holds no
 * session, so a rail, a top bar and their rows would be chrome over questions
 * the server will refuse, and a row offering a workspace to somebody who has
 * not said who they are is a promise the next click breaks.
 *
 * ONE COLUMN, NARROW, AT THE TOP. The column is a sentence's measure wide and
 * starts near the top of the window rather than its middle, so the form does
 * not jump when an error line appears under a field. The card is a section
 * named by its title, which is the page's `h1`; the description is its lede,
 * and the body stacks the form's parts one field step apart.
 *
 * The mark is the design system's own drawing, inline, through
 * [BrandLockup], so nothing is fetched and the lockup reads as it does at the
 * head of the rail.
 */
export function AuthLayout({
  title,
  description,
  productName = 'Crewlet',
  mark,
  homeHref,
  children,
  className,
}: AuthLayoutProps) {
  const heading = useId();
  return (
    <main className={cx('crewlet-auth-layout', className)}>
      <div className="crewlet-auth-layout__column">
        <BrandLockup
          className="crewlet-auth-layout__brand"
          name={productName}
          mark={mark ?? <CrewletIcon />}
          href={homeHref}
        />
        <Card as="section" padding="lg" aria-labelledby={heading}>
          <Card.Title as="h1" id={heading}>
            {title}
          </Card.Title>
          {description ? <Card.Description>{description}</Card.Description> : null}
          {/* A card whose title and description say it all has no body, and
              draws no empty gap under them. */}
          {children === undefined || children === null || children === false ? null : (
            <div className="crewlet-auth-layout__body">{children}</div>
          )}
        </Card>
      </div>
    </main>
  );
}
