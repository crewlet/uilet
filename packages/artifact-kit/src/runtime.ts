/**
 * The part of the artifact runtime (`window.crewlet`, runtime contract 1.0)
 * the kit binds to, declared structurally in the runtime's own names. The
 * contract is the engine's: `docs/reference/artifact-runtime.md` in
 * github.com/crewlet/crewlet.
 *
 * The kit talks ONLY to `window.crewlet`, so a sheet on a page has exactly the
 * page's capabilities and no more: the runtime holds no credential the page
 * can reach, binds the artifact from the frame it created, checks every call
 * against what the version declared, and the engine authorises every write. A
 * namespace the version did not declare still exists and rejects every call
 * with `capability_not_declared`, so the kit asks `capabilities.has` first.
 *
 * Only what the kit calls is declared here, so a newer runtime that adds to
 * the contract (it is additive within a major) still satisfies it.
 */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Unsubscribe = () => void;

/** The capabilities the sheet reads, as a version declares them. */
export type KitCapability = 'db' | 'presence' | 'identity';

/** Somebody a page may name: display facts only, never a token, a login or an address. */
export interface KitPerson {
  /** The seat handle: the value a person cell stores. */
  seat: string;
  kind: 'human' | 'agent';
  displayName: string;
  /** An agent's face: one of the character family and its node hue. A person has none. */
  avatar?: { character: string; hue: string } | undefined;
}

export interface KitViewer extends KitPerson {
  role: 'viewer' | 'commenter' | 'contributor' | 'editor' | 'owner';
}

/** One document as the runtime hands it to a page. */
export interface KitDoc {
  id: string;
  data: Record<string, Json>;
  version: number;
  /** A write this page made on it is not decided yet. */
  pending: boolean;
}

/** How a write ended: every verdict the engine decided is an answer, never a rejection. */
export type KitVerdict = 'applied' | 'pending' | 'conflict' | 'invalid' | 'forbidden' | 'quota' | 'gone';

export interface KitWriteOutcome {
  verdict: KitVerdict;
  /** The write's place in the store's history. */
  seq?: number | undefined;
  /** Why, for every verdict but `applied`. */
  reason?: string | undefined;
}

/**
 * A call the runtime rejected: nothing about it was decided (`rate_limited`,
 * `unavailable`), the version did not declare it (`capability_not_declared`),
 * or a read was refused (`forbidden`, `not_found`).
 */
export interface KitError extends Error {
  code: string;
}

/** A schema column as the engine's datastore holds it (`artifacts.Column`). */
export interface KitSchemaColumn {
  key: string;
  type: string;
  label?: string | undefined;
  required?: boolean | undefined;
  primary?: boolean | undefined;
  hidden?: boolean | undefined;
  min?: number | undefined;
  max?: number | undefined;
  max_length?: number | undefined;
  max_items?: number | undefined;
  options?: { id: string; label: string; color?: string; category?: string; archived?: boolean }[] | undefined;
}

/** One collection of the datastore's schema, as `data.schema()` answers it. */
export interface KitCollectionSchema {
  name: string;
  title?: string | undefined;
  /** Absent for a schemaless collection. */
  columns?: KitSchemaColumn[] | undefined;
}

export interface KitCollection {
  /** The collection's documents, then every change; `onError` once, and no delivery, when the subscription is refused. */
  subscribe(callback: (docs: KitDoc[], change: { changed: string[]; removed: string[] }) => void, onError?: (error: KitError) => void): Unsubscribe;
  /** Replaces a document's fields, creating it. */
  set(id: string, fields: Record<string, Json>): Promise<KitWriteOutcome>;
  /** Sets the named fields and leaves the rest; a null removes a field. */
  merge(id: string, fields: Record<string, Json>): Promise<KitWriteOutcome>;
}

export interface KitBatch {
  merge(collection: string, id: string, fields: Record<string, Json>): KitBatch;
  /** One write, all or nothing. */
  commit(): Promise<KitWriteOutcome>;
}

/** Where in the artifact a member is. */
export interface KitFocus {
  version?: number | undefined;
  region?: string | undefined;
  collection?: string | undefined;
  doc?: string | undefined;
  field?: string | undefined;
}

/** One session in the artifact's room, and the person the chart says holds it. */
export interface KitMember extends KitPerson {
  /** One per tab. */
  session: string;
  activity: 'viewing' | 'editing' | 'idle';
  focus: KitFocus;
  at: string;
}

export interface KitRoster {
  members: KitMember[];
  counts?: { human: number; agent: number } | undefined;
  truncated: boolean;
}

export interface KitRuntime {
  capabilities: { has(name: string): boolean };
  connection?: { state: string; subscribe(callback: (state: string) => void): Unsubscribe } | undefined;
  identity: {
    me(): Promise<KitViewer>;
    /** Every seat of the company, for a person picker. */
    people(): Promise<KitPerson[]>;
  };
  data: {
    collection(name: string): KitCollection;
    batch(): KitBatch;
    schema(): Promise<KitCollectionSchema[]>;
    /** The page's own last write on this tab, undone; null when there is none. */
    undo(): Promise<KitWriteOutcome | null>;
    /** The page's last undo, undone; null when there is none. */
    redo(): Promise<KitWriteOutcome | null>;
  };
  presence: {
    roster(): KitRoster;
    subscribe(callback: (roster: KitRoster) => void): Unsubscribe;
    set(state: { activity?: KitMember['activity']; focus?: KitFocus }): void;
  };
}

declare global {
  interface Window {
    crewlet?: KitRuntime;
  }
}

/** The event the runtime dispatches on `window` once `window.crewlet` is installed. */
export const RUNTIME_READY_EVENT = 'crewlet:ready';

/**
 * The runtime, now or once it is installed. The runtime script is placed by
 * the artifact origin before any page script, so this nearly always answers
 * at once; a page that loads the kit first waits for the runtime's ready
 * event.
 */
export function whenRuntime(target: Window = window): Promise<KitRuntime> {
  if (target.crewlet) return Promise.resolve(target.crewlet);
  return new Promise((resolve) => {
    const ready = () => {
      if (!target.crewlet) return;
      target.removeEventListener(RUNTIME_READY_EVENT, ready);
      resolve(target.crewlet);
    };
    target.addEventListener(RUNTIME_READY_EVENT, ready);
  });
}

/**
 * A new document's id: random, and within the engine's document grammar.
 * The runtime has no create call (a page names every document it writes), so
 * Add row mints one and `set`s it, exactly as the dashboard's own sheet does.
 */
export function newDocId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
