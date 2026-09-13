import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

export type CopyableVariant = 'chip' | 'inline' | 'block';

export interface CopyableProps {
  value: string | number | null | undefined;
  display?: string;
  variant?: CopyableVariant;
  monospace?: boolean;
  truncate?: boolean;
  truncateLength?: number;
  ariaLabel?: string;
  className?: string;
}

const COPIED_DURATION_MS = 1500;

const truncateValue = (text: string, length: number, variant: CopyableVariant): string => {
  if (text.length <= length) return text;
  if (variant === 'chip') {
    const head = Math.max(4, length - 5);
    const tail = Math.min(4, Math.max(2, length - head - 1));
    return `${text.slice(0, head)}…${text.slice(-tail)}`;
  }
  return `${text.slice(0, length)}…`;
};

const writeToClipboard = async (text: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
};

export const Copyable = ({
  value,
  display,
  variant = 'chip',
  monospace = false,
  truncate = false,
  truncateLength,
  ariaLabel,
  className = '',
}: CopyableProps) => {
  const text = value === undefined || value === null ? '' : String(value);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!text) return null;

  const resolvedLength = truncateLength ?? (variant === 'chip' ? 14 : 24);
  const shouldTruncate = truncate || (variant === 'chip' && text.length > resolvedLength);
  const rendered = display ?? (shouldTruncate ? truncateValue(text, resolvedLength, variant) : text);

  const onCopy = async (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    event.preventDefault();
    try {
      await writeToClipboard(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPIED_DURATION_MS);
    } catch {
      // Clipboard refused (permissions, http context). No UI affordance for the failure.
    }
  };

  const classes = [
    'crewlet-copyable',
    `crewlet-copyable--${variant}`,
    monospace ? 'crewlet-copyable--monospace' : '',
    copied ? 'is-copied' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      <span
        className="crewlet-copyable__value"
        title={text}
        role="button"
        tabIndex={0}
        onClick={onCopy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onCopy(e);
        }}
      >
        {rendered}
      </span>
      <button
        type="button"
        className="crewlet-copyable__button"
        onClick={onCopy}
        aria-label={ariaLabel || 'Copy to clipboard'}
        title="Copy"
      >
        <span className="material-symbols-outlined" aria-hidden>
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </span>
  );
};
