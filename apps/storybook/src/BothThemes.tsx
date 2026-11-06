import type { CSSProperties, ReactNode } from 'react';
import { themeScope } from './themeScope';

const panel: CSSProperties = {
  padding: 'var(--spacing-4)',
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  borderRadius: 'var(--radius-lg)',
};

/**
 * The same content painted light over dark, each panel scoped by `themeScope`,
 * so one story shows a component in both palettes at once.
 */
export function BothThemes({ children, gap = 'var(--spacing-5)' }: { children: ReactNode; gap?: string }) {
  return (
    <div style={{ display: 'grid', gap }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme-panel={theme} style={{ ...panel, ...themeScope(theme) }}>
          {children}
        </div>
      ))}
    </div>
  );
}
