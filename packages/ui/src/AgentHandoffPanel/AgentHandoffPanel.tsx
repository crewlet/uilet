import { useEffect, useId, useRef, type ReactNode, type Ref } from 'react';
import { ArtifactPanel } from '../ArtifactPanel/index.js';
import { Button } from '../Button/index.js';
import { Composer } from '../Composer/index.js';
import { Disclosure } from '../Disclosure/index.js';
import { Section } from '../Section/index.js';
import { Timeline } from '../Timeline/index.js';
import { cx } from '../utils/cx.js';

/** One thing that goes to the agent with the brief: the draft, the slides laid out, the board. */
export interface AgentHandoffItem {
  key: string;
  /** A small glyph before the words. */
  icon?: ReactNode;
  /** What it is, in a line: "Your draft", "4 slides in Nightshade". */
  label: ReactNode;
  /** A second, quieter line: how much of it, or what the agent does with it. */
  detail?: ReactNode;
}

/** A brief to start from, offered while the brief is empty. */
export interface AgentHandoffStarter {
  key: string;
  /** Its name on the chip: "Incident review". */
  label: string;
}

/** The panel's commit: the press that files the work. */
export interface AgentHandoffSend {
  /** Its words: "Ask SRE Lead". */
  label: string;
  /** Drawn before the words and hidden from the name: the chosen agent's character. */
  media?: ReactNode;
  onSend: () => void;
  /** Unavailable, and why. Said on the button and, in words, beside it. */
  disabledReason?: string | undefined;
  /** Filing the work now. */
  busy?: boolean | undefined;
}

export interface AgentHandoffLabels {
  title: string;
  brief: string;
  starters: string;
  agent: string;
  carried: string;
  task: string;
  next: string;
  step: string;
}

export const AGENT_HANDOFF_LABELS: AgentHandoffLabels = {
  title: 'Ask an agent',
  brief: 'Brief',
  starters: 'Start from',
  agent: 'Who builds it',
  carried: 'Goes with it',
  task: 'The task as it is filed',
  next: 'What happens next',
  step: 'Step',
};

export interface AgentHandoffPanelProps {
  onClose: () => void;
  /** A glyph before the title: the one on the control that opened the panel. */
  icon?: ReactNode;
  /** See [ArtifactPanel]: false for a panel that is open on arrival. */
  focusOnOpen?: boolean | undefined;
  /** A line under the title saying what the panel does, in the kind's words. */
  intro?: ReactNode;

  brief: string;
  onBriefChange: (brief: string) => void;
  /** The brief field's visible name, asked as a question where that reads better. */
  briefLabel?: string | undefined;
  briefPlaceholder?: string | undefined;
  /** Under the field: what a good brief says. */
  briefHelper?: ReactNode;
  briefMaxLength?: number | undefined;
  briefRef?: Ref<HTMLTextAreaElement> | undefined;

  /** Briefs to start from, drawn while the brief is empty. */
  starters?: readonly AgentHandoffStarter[] | undefined;
  onStarter?: ((key: string) => void) | undefined;

  /** The kind's own fields, under the brief: what a page may do, references. */
  children?: ReactNode;
  /** Who builds it: the host's agent picker, and the project it files in. */
  agent: ReactNode;
  /** What goes to the agent with the brief, so nothing the reader made is lost. */
  carried?: readonly AgentHandoffItem[] | undefined;
  /** The task exactly as it is filed, behind a disclosure. */
  task?: { title: string; body: string } | undefined;
  /** What happens after the press, step by step. */
  steps?: readonly ReactNode[] | undefined;
  /** A refusal or a warning, said above the commit. */
  notice?: ReactNode;
  send: AgentHandoffSend;
  labels?: Partial<AgentHandoffLabels> | undefined;
  className?: string | undefined;
}

/**
 * Handing the work to an agent, at the side of what the reader is making.
 *
 * A PANEL, NOT A MODE. The page beside it is the direct way to make the thing,
 * and stays live and editable while the brief is written, so a person can lay
 * out a slide, then ask, then lay out another. What they made goes with the
 * brief (`carried`), and the panel says so, so moving between the two ways
 * loses nothing. Built on [ArtifactPanel], so it is a column where there is
 * room, a drawer over the page's end where there is not, and the screen on a
 * phone, exactly as an open artifact's panels are.
 *
 * THE BRIEF FIRST, as every agent composer puts it: the field the reader came
 * to fill, with briefs to start from while it is empty. Then who builds it,
 * what goes with it, the task as it is filed and what happens next, so nothing
 * about the ask is hidden. The commit sits in the panel's foot, always in
 * reach, with the chosen agent's character beside its words; Command+Enter
 * anywhere in the panel presses it. A send that is held says why in words
 * beside it, not only in the button's tooltip.
 */
export function AgentHandoffPanel({
  onClose,
  icon,
  focusOnOpen,
  intro,
  brief,
  onBriefChange,
  briefLabel,
  briefPlaceholder,
  briefHelper,
  briefMaxLength,
  briefRef,
  starters = [],
  onStarter,
  children,
  agent,
  carried = [],
  task,
  steps = [],
  notice,
  send,
  labels,
  className,
}: AgentHandoffPanelProps) {
  const words = { ...AGENT_HANDOFF_LABELS, ...labels };
  const briefId = useId();
  const helperId = useId();
  const held = send.disabledReason !== undefined || send.busy === true;
  const press = () => {
    if (!held) send.onSend();
  };

  // COMMAND+ENTER FROM ANY FIELD IN THE PANEL sends, a picker or a checkbox
  // as well as the brief (whose own handler answers it first), and the press
  // is answered here, at the document and before the window, so a page-wide
  // shortcut behind the panel sees it handled. Heard at the document for the
  // reason ArtifactPanel hears Escape there: a surface portalled out of the
  // panel (a picker's list) is not inside it, and only a press from inside
  // the body counts. The send is read through a ref, so a new one each render
  // does not re-register it.
  const body = useRef<HTMLDivElement>(null);
  const sendNow = useRef(press);
  sendNow.current = press;
  useEffect(() => {
    const root = body.current;
    if (!root) return undefined;
    const doc = root.ownerDocument;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
      if (!(event.target instanceof Node) || !root.contains(event.target)) return;
      event.preventDefault();
      sendNow.current();
    };
    doc.addEventListener('keydown', onKeyDown);
    return () => doc.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <ArtifactPanel
      title={words.title}
      icon={icon}
      onClose={onClose}
      focusOnOpen={focusOnOpen}
      className={cx('crewlet-agent-handoff', className)}
      footer={
        <div className="crewlet-agent-handoff__foot">
          {send.disabledReason && !send.busy ? (
            <p className="crewlet-agent-handoff__reason">{send.disabledReason}</p>
          ) : null}
          <Button
            className="crewlet-agent-handoff__send"
            variant="primary"
            block
            leadingIcon={
              send.media ? (
                <span className="crewlet-agent-handoff__media" aria-hidden>
                  {send.media}
                </span>
              ) : undefined
            }
            loading={send.busy}
            disabledReason={send.busy ? undefined : send.disabledReason}
            onClick={press}
          >
            {send.label}
          </Button>
        </div>
      }
    >
      <div ref={body} className="crewlet-agent-handoff__body">
        {intro ? <p className="crewlet-agent-handoff__intro">{intro}</p> : null}

        <div className="crewlet-agent-handoff__brief">
          <label className="crewlet-agent-handoff__label" htmlFor={briefId}>
            {briefLabel ?? words.brief}
          </label>
          <Composer
            ref={briefRef}
            id={briefId}
            label={briefLabel ?? words.brief}
            aria-describedby={briefHelper ? helperId : undefined}
            value={brief}
            onChange={onBriefChange}
            onSubmit={press}
            placeholder={briefPlaceholder}
            maxLength={briefMaxLength}
            rows={4}
          />
          {briefHelper ? (
            <p id={helperId} className="crewlet-agent-handoff__helper">
              {briefHelper}
            </p>
          ) : null}
          {starters.length > 0 && onStarter && brief.trim() === '' ? (
            <div className="crewlet-agent-handoff__starters" role="group" aria-label={words.starters}>
              {starters.map((s) => (
                <Button key={s.key} size="small" variant="secondary" onClick={() => onStarter(s.key)}>
                  {s.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {children}

        <Section title={words.agent} className="crewlet-agent-handoff__section">
          {agent}
        </Section>

        {carried.length > 0 || task ? (
          <Section title={words.carried} className="crewlet-agent-handoff__section">
            {carried.length > 0 ? (
              <ul className="crewlet-agent-handoff__carried">
                {carried.map((item) => (
                  <li key={item.key} className="crewlet-agent-handoff__item">
                    {item.icon ? (
                      <span className="crewlet-agent-handoff__item-icon" aria-hidden>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="crewlet-agent-handoff__item-words">
                      <span className="crewlet-agent-handoff__item-label">{item.label}</span>
                      {item.detail ? <span className="crewlet-agent-handoff__item-detail">{item.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {task ? (
              <Disclosure
                title={words.task}
                size="compact"
                headingLevel="none"
                lazy
                className="crewlet-agent-handoff__task-disclosure"
              >
                <div className="crewlet-agent-handoff__task">
                  <p className="crewlet-agent-handoff__task-title">{task.title}</p>
                  <pre className="crewlet-agent-handoff__task-body">{task.body}</pre>
                </div>
              </Disclosure>
            ) : null}
          </Section>
        ) : null}

        {steps.length > 0 ? (
          <Section title={words.next} className="crewlet-agent-handoff__section">
            <Timeline itemLabel={words.step} className="crewlet-agent-handoff__steps">
              {steps.map((step, i) => (
                <Timeline.Item key={i}>{step}</Timeline.Item>
              ))}
            </Timeline>
          </Section>
        ) : null}

        {notice}
      </div>
    </ArtifactPanel>
  );
}
