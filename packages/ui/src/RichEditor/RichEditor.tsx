/**
 * `RichEditor`: Markdown edited in place, as the document it reads as.
 *
 * # Loaded when somebody edits
 *
 * The editor is ProseMirror and everything around it, which is more than a
 * reader of a page needs, so this component is a SHELL: it fetches the engine
 * (`Editor.tsx`) with `import()` the first time one is drawn, and a bundler
 * splits that into a chunk of its own. While the chunk loads the shell draws
 * the caller's `fallback` (the body as it reads, so nothing moves) or a
 * skeleton.
 *
 * A LOAD THAT FAILED IS FORGOTTEN, so the next attempt asks the server again
 * rather than replaying the failure for the life of the page: the usual
 * cause is a deploy that renamed the chunk while the page was open, and the
 * other is one dropped request, which a retry fixes.
 */

import { forwardRef, useEffect, useState, type ComponentType, type RefAttributes } from 'react';
import { Button } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import { Skeleton } from '../Skeleton/index.js';
import { richEditorLabels, type RichEditorHandle, type RichEditorProps } from './types.js';

type EngineComponent = ComponentType<RichEditorProps & RefAttributes<RichEditorHandle>>;

let engine: EngineComponent | null = null;
let loading: Promise<EngineComponent> | null = null;

function loadEngine(): Promise<EngineComponent> {
  loading ??= import('./Editor.js').then(
    (module) => {
      engine = module.Editor as EngineComponent;
      return engine;
    },
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

/**
 * Fetch the editor's code ahead of the first edit, on a press that is about
 * to open one. It settles once the code is there, or once fetching it has
 * failed, which the editor itself then says where it is drawn.
 */
export function preloadRichEditor(): Promise<void> {
  return loadEngine().then(
    () => undefined,
    () => undefined,
  );
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(props, ref) {
  const [Engine, setEngine] = useState<EngineComponent | null>(() => engine);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (Engine) return;
    let live = true;
    loadEngine().then(
      (loaded) => {
        if (live) setEngine(() => loaded);
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [Engine, attempt]);

  if (Engine) return <Engine ref={ref} {...props} />;
  const text = richEditorLabels(props.labels);
  if (failed) {
    return (
      <Callout
        variant="danger"
        title={text.failed}
        action={
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            {text.retry}
          </Button>
        }
      >
        {text.failedDetail}
      </Callout>
    );
  }
  return (
    <div className="crewlet-rich-editor crewlet-rich-editor--loading" aria-busy="true">
      {props.fallback ?? <Skeleton variant="text" rows={6} label={text.loading} />}
    </div>
  );
});
