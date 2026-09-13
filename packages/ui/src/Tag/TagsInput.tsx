import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { Tag, type TagVariant } from './Tag.js';

export interface TagsInputProps {
  /** Current list of tag values. */
  value: string[];
  /** Called with the next list when add / remove fires. */
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Variant applied to each rendered Tag. */
  tagVariant?: TagVariant;
  /** Monospace flag forwarded to each Tag, for machine values such as IP addresses and CIDR ranges. */
  monospace?: boolean;
  /** Keys that submit the current input as a new tag. Defaults to Enter and comma. */
  submitKeys?: string[];
  /** Disable input + remove buttons. */
  disabled?: boolean;
  className?: string;
  /** id forwarded to the underlying input (handy for `<label htmlFor>`). */
  id?: string;
  /** Reject duplicate values (case-insensitive). Defaults to true. */
  dedupe?: boolean;
}

export interface TagsInputHandle {
  focus: () => void;
}

export const TagsInput = forwardRef<TagsInputHandle, TagsInputProps>(function TagsInput(
  {
    value,
    onChange,
    placeholder = 'Add a tag, press Enter or comma',
    tagVariant = 'neutral',
    monospace = false,
    submitKeys = ['Enter', ','],
    disabled = false,
    className = '',
    id,
    dedupe = true,
  },
  ref,
) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (dedupe && value.some((v) => v.toLowerCase() === next.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (submitKeys.includes(event.key)) {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text.includes(',') && !text.includes('\n')) return;
    event.preventDefault();
    const parts = text.split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const set = dedupe
      ? new Set(value.map((v) => v.toLowerCase()))
      : null;
    const added: string[] = [];
    for (const p of parts) {
      if (set && set.has(p.toLowerCase())) continue;
      added.push(p);
      set?.add(p.toLowerCase());
    }
    if (added.length) onChange([...value, ...added]);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  const onContainerClick = () => {
    inputRef.current?.focus();
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const classes = ['crewlet-tags-input', disabled ? 'is-disabled' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onContainerClick}>
      {value.map((tag, index) => (
        <Tag
          key={`${index}-${tag}`}
          variant={tagVariant}
          monospace={monospace}
          onRemove={disabled ? undefined : () => removeAt(index)}
          removeAriaLabel={`Remove ${tag}`}
        >
          {tag}
        </Tag>
      ))}
      <input
        ref={inputRef}
        id={id}
        className="crewlet-tags-input__field"
        type="text"
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => commit(draft)}
      />
    </div>
  );
});
