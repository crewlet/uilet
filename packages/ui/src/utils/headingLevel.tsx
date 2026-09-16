import { createContext, useContext, type ReactNode } from 'react';

/** The heading elements a component may render. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * How deep the headings are where a component finds itself.
 *
 * WHY IT IS A CONTEXT. A heading level is not a property of a component; it is
 * a property of where the component is. The same form section is an `h3` on a
 * page under an `h2` screen title and an `h2` inside a dialog, whose own title
 * is the `h1` of everything beneath it. A component that hard-codes its tag is
 * right in one of those places and wrong in the other, and a screen reader
 * navigating by heading meets a document outline with a level missing.
 *
 * A surface that introduces a title provides the level its children start at;
 * anything that renders a heading reads it and steps down for what it
 * contains. There is no level 7, so the step CLAMPS at 6: a heading at 7 is
 * not a heading at all, and a `div` in the middle of an outline is worse than
 * a repeated level.
 */
const HeadingLevelContext = createContext<HeadingLevel>(2);

export interface HeadingLevelProviderProps {
  /** The level the children's own headings start at. */
  level: HeadingLevel;
  children?: ReactNode;
}

/** Declares the level a surface's contents start at. */
export function HeadingLevelProvider({ level, children }: HeadingLevelProviderProps) {
  return <HeadingLevelContext.Provider value={level}>{children}</HeadingLevelContext.Provider>;
}

/** The level a heading rendered here should be. Defaults to 2, under a page title. */
export function useHeadingLevel(): HeadingLevel {
  return useContext(HeadingLevelContext);
}

/** One level deeper, clamped at 6. */
export function nextHeadingLevel(level: HeadingLevel): HeadingLevel {
  return (level < 6 ? level + 1 : 6) as HeadingLevel;
}

/** The tag name for a level, for a component that renders one. */
export function headingTag(level: HeadingLevel): `h${HeadingLevel}` {
  return `h${level}`;
}
