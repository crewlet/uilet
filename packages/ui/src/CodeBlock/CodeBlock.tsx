import { Copyable } from '../Copyable/index.js';

export interface CodeBlockProps {
  /** The code to display and copy. Trailing newline is trimmed. */
  code: string;
  /** Language label shown in the header when no filename is given (also set as a data attribute). */
  language?: string;
  /** Optional filename shown on the left of the header. */
  filename?: string;
  showLineNumbers?: boolean;
  /** Render the copy control. Defaults to true. */
  copyable?: boolean;
  /** Non-selectable per-line prompt prefix, e.g. "$" for shell commands. */
  prompt?: string;
  className?: string;
}

/**
 * CodeBlock, a monospace command or config block. Preserves whitespace,
 * scrolls horizontally rather than wrapping, and reuses Copyable for a
 * one-click copy of the full snippet.
 */
export const CodeBlock = ({
  code,
  language,
  filename,
  showLineNumbers = false,
  copyable = true,
  prompt,
  className = '',
}: CodeBlockProps) => {
  const lines = code.replace(/\n+$/, '').split('\n');
  const showHeader = Boolean(filename) || Boolean(language) || copyable;

  const classes = [
    'crewlet-codeblock',
    showLineNumbers ? 'crewlet-codeblock--numbered' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {showHeader ? (
        <div className="crewlet-codeblock__header">
          <span className="crewlet-codeblock__meta">
            {filename ? <span className="crewlet-codeblock__filename">{filename}</span> : null}
            {language && !filename ? (
              <span className="crewlet-codeblock__lang">{language}</span>
            ) : null}
          </span>
          {copyable ? (
            <Copyable
              value={code}
              display="Copy"
              variant="inline"
              ariaLabel="Copy code to clipboard"
              className="crewlet-codeblock__copy"
            />
          ) : null}
        </div>
      ) : null}
      <pre className="crewlet-codeblock__pre" data-language={language}>
        <code className="crewlet-codeblock__code">
          {lines.map((line, index) => (
            <span className="crewlet-codeblock__line" key={`${index}-${line}`}>
              {showLineNumbers ? (
                <span className="crewlet-codeblock__ln" aria-hidden>
                  {index + 1}
                </span>
              ) : null}
              {prompt ? (
                <span className="crewlet-codeblock__prompt" aria-hidden>
                  {prompt}
                </span>
              ) : null}
              <span className="crewlet-codeblock__linecontent">{line || ' '}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
};
