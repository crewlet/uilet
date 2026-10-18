/**
 * The part of the artifact runtime (`window.crewlet`, runtime contract 1.0)
 * the kit binds to, declared structurally.
 *
 * The kit talks ONLY to `window.crewlet`, so a sheet on a page has exactly the
 * page's capabilities and no more: the runtime holds no credential the page
 * can reach, binds the artifact from the frame it created, checks every call
 * against the manifest, and the engine authorises every write. A namespace
 * the manifest did not declare still exists and rejects every call with
 * `capability_not_declared`, so the kit asks `capabilities.has` first.
 *
 * Only what the kit calls is declared here, in the runtime's own names, so a
 * newer runtime that adds to the contract (it is additive within a major)
 * still satisfies it.
 */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Unsubscribe = () => void;

export type KitCapability = 'data' | 'presence' | 'identity';

export interface KitViewer {
  /** A stable principal reference within the company, the value a person cell stores. */
  id: string;
  kind: 'human' | 'agent';
  displayName: string;
  avatar?: { character?: string | undefined; initials?: string | undefined; hue?: string | undefined } | undefined;
  role?: 'viewer' | 'commenter' | 'contributor' | 'editor' | 'owner' | undefined;
}

export interface KitDoc {
  id: string;
  data: Record<string, Json>;
  meta?: { pending?: boolean | undefined } | undefined;
}

export interface KitLiveView {
  docs: KitDoc[];
}

export type KitWriteOutcome =
  | { outcome: 'applied' | 'pending'; position?: number; version?: number }
  | { outcome: 'unconfirmed' }
  | { outcome: 'refused'; code: string; detail?: string | undefined };

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

export interface KitSchema {
  title?: string | undefined;
  columns?: KitSchemaColumn[] | undefined;
}

export interface KitCollection {
  schema(): Promise<KitSchema | null>;
  subscribe(query: null, callback: (view: KitLiveView) => void): Unsubscribe;
  create(data: Record<string, Json>): Promise<KitWriteOutcome & { id?: string }>;
  update(id: string, patch: Record<string, Json>): Promise<KitWriteOutcome>;
}

export interface KitBatch {
  update(collection: string, id: string, patch: Record<string, Json>): KitBatch;
  commit(): Promise<KitWriteOutcome>;
}

export interface KitPresenceFocus {
  collection?: string | undefined;
  doc?: string | undefined;
  field?: string | undefined;
}

export interface KitPeer {
  session: string;
  viewer: KitViewer;
  status: 'active' | 'idle' | 'away' | 'working';
  state: { focus?: KitPresenceFocus | null | undefined; editing?: KitPresenceFocus | null | undefined };
  /** The presence hue the runtime assigned, a uilet token name. */
  color?: string | undefined;
}

export interface KitRuntime {
  capabilities: { has(name: string): boolean };
  connection?: { state: string; subscribe(callback: (state: string) => void): Unsubscribe } | undefined;
  identity: {
    me(): Promise<KitViewer>;
    lookup(ids: string[]): Promise<Record<string, KitViewer | null>>;
    people(query?: string): Promise<KitViewer[]>;
  };
  data: {
    collection(name: string): KitCollection;
    batch(): KitBatch;
    undo(): Promise<unknown>;
    redo(): Promise<unknown>;
  };
  presence: {
    subscribe(callback: (peers: KitPeer[]) => void): Unsubscribe;
    set(state: { focus?: KitPresenceFocus | null; editing?: KitPresenceFocus | null }): void;
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
 * The runtime, now or once it is installed. The runtime script is loaded by
 * the page's shell before any page script, so this nearly always answers at
 * once; a page that loads the kit first waits for the runtime's ready event.
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
