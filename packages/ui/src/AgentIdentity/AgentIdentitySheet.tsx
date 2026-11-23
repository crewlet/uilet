import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Button, ButtonLink } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import { Copyable } from '../Copyable/index.js';
import { Disclosure } from '../Disclosure/index.js';
import { FileDrop, FilePickButton, type PickedFile } from '../FileDrop/index.js';
import { FormField, Input } from '../Input/index.js';
import { List, ListItem } from '../List/index.js';
import { Modal, type ModalProps } from '../Modal/index.js';
import { StepList, Stepper, type StepListStep, type StepState } from '../Stepper/index.js';
import { Text } from '../Text/index.js';
import { AGENT_IDENTITY_WORDS } from './AgentIdentity.js';

/** A value the person copies at the vendor, and the vendor's rule it was made to. */
export interface AgentIdentityCopy {
  /** What the value is, for the copy control's name: "key's name". */
  label: string;
  value: string;
  /** The rule the value keeps, said under it: "Lowercase letters, digits and hyphens, at most 30." */
  rule?: ReactNode;
}

/** One numbered step at the vendor, in the vendor's own labels. */
export interface AgentIdentityVendorStep {
  text: ReactNode;
  /** The value to copy at this step, drawn under its words. */
  copy?: AgentIdentityCopy | undefined;
}

/** One read the check makes, or one thing Crewlet does when it makes the identity itself. */
export interface AgentIdentityRead {
  id: string;
  label: ReactNode;
}

/** What the person brings back from the vendor. */
export type AgentIdentityHandIn =
  | {
      kind: 'file';
      /** The file's extension, as an input's `accept`: ".p8". */
      accept: string;
      /** What the file is and where it came from, under the drop area. */
      hint: ReactNode;
      /** A value read from the file's name, editable: Apple's key ID from `AuthKey_<ID>.p8`. */
      field?: { label: string; fromName?: RegExp | undefined } | undefined;
      /** One more value beside the file, typed and optional, drawn under the field with one line of hint. */
      detail?: { label: string; hint?: ReactNode; inputMode?: 'text' | 'numeric' | undefined } | undefined;
    }
  | { kind: 'token'; label: string; hint?: ReactNode }
  | { kind: 'nothing'; text: ReactNode };

/** What the person brought back, for the page to send to the check. */
export interface AgentIdentityBrought {
  /** Whether the identity was made by Crewlet (Make it for me), with nothing brought back. */
  made: boolean;
  file?: File;
  field?: string;
  /** The hand-in's `detail`, trimmed; left out where the person typed nothing. */
  detail?: string;
  token?: string;
}

/** The check's answer. */
export interface AgentIdentityVerdict {
  /** Whether the identity works and Crewlet keeps it. */
  ok: boolean;
  /** The verdict as the page words it: what was read back and what to do. */
  view: ReactNode;
  /** The read the check stopped at, by its id; the last read where it is left out. */
  failedAt?: string | undefined;
}

/** Crewlet can make the identity itself, with one button. */
export interface AgentIdentityMake {
  title: ReactNode;
  /** What pressing it does, in the vendor's words, and any limit it counts against. */
  body: ReactNode;
  /** Why it cannot be pressed now, such as the vendor's limit reached; the steps by hand then stand open. */
  disabledReason?: string | undefined;
  /** What Crewlet does before the reads, listed with them in the check: "Make the system user". */
  reads?: readonly AgentIdentityRead[] | undefined;
}

/** The sheet's three steps. */
export type AgentIdentitySheetStep = 'vendor' | 'back' | 'check';

export interface AgentIdentitySheetProps {
  open: boolean;
  onClose: () => void;
  /** The agent's name, for the title: "Set up identity: Growth Marketer". */
  agent: string;
  /** The vendor, by its own name: "Apple". */
  vendor: string;
  /** One line under the title: what the agent's own identity changes. */
  why: ReactNode;
  /** A new identity for an agent that holds one: the title says Replace identity. */
  replacing?: boolean | undefined;
  /** The steps at the vendor, numbered, in its own labels. */
  steps: readonly AgentIdentityVendorStep[];
  /**
   * The vendor's page, as a button under the steps, only where no step names
   * it; a step that names the page links its own words (`VendorText`).
   */
  link?: { label: string; href: string } | undefined;
  /** Who at the vendor may do it, and what never to choose there. */
  note?: ReactNode;
  /** A limit or a caution that applies now, over the steps. */
  caution?: ReactNode;
  /** Crewlet can make it: one button, with the steps by hand folded under it. */
  make?: AgentIdentityMake | undefined;
  /** What comes back from the vendor: a file, a token, or nothing. */
  handIn: AgentIdentityHandIn;
  /** The reads the check makes, in order. */
  reads: readonly AgentIdentityRead[];
  /** Checks what was brought back or made, and answers the verdict. A rejection is drawn as a check that did not finish. */
  onCheck: (brought: AgentIdentityBrought) => Promise<AgentIdentityVerdict>;
  /** The step the sheet opens on: `back` for a person who holds the new file or token already. */
  startAt?: Exclude<AgentIdentitySheetStep, 'check'> | undefined;
  /**
   * The dialog the sheet opens in: the kit's `Modal` by default, or an
   * application's own wrapper around it with the same props.
   */
  modal?: ComponentType<ModalProps> | undefined;
}

/**
 * The one sheet every vendor's Set up identity opens, in the same three steps:
 *
 * 1. At the vendor: numbered steps in its own labels, the vendor's page linked
 *    on the step that names it, each value to copy under its step with the
 *    rule it keeps; or, where Crewlet
 *    can, one button that makes it, the steps by hand folded under it.
 * 2. Back here: the file or the token the vendor gave, or nothing.
 * 3. Check: the reads Crewlet makes, then the verdict.
 *
 * It holds no vendor words and no data: the page passes the steps, the hand-in
 * and the check. What the person brought back lives only in the sheet until
 * the check, and goes when it closes.
 */
export function AgentIdentitySheet(props: AgentIdentitySheetProps) {
  // A CLOSED SHEET KEEPS NOTHING: the walk mounts fresh each time it opens.
  return props.open ? <Walk {...props} /> : null;
}

const STEPS: readonly AgentIdentitySheetStep[] = ['vendor', 'back', 'check'];

/** Whether a file's name ends with one of the extensions an `accept` lists; any file where it lists none. */
function accepted(name: string, accept: string): boolean {
  const extensions = accept
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.startsWith('.'));
  return extensions.length === 0 || extensions.some((e) => name.toLowerCase().endsWith(e));
}

/** The message of whatever a rejected check threw. */
function messageOf(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return null;
}

function Walk({
  onClose,
  agent,
  vendor,
  why,
  replacing,
  steps,
  link,
  note,
  caution,
  make,
  handIn,
  reads,
  onCheck,
  startAt = 'vendor',
  modal: Dialog = Modal,
}: AgentIdentitySheetProps) {
  const [step, setStep] = useState<AgentIdentitySheetStep>(startAt);
  const [reached, setReached] = useState<AgentIdentitySheetStep>(startAt);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [field, setField] = useState('');
  const [detail, setDetail] = useState('');
  const [token, setToken] = useState('');
  const [made, setMade] = useState(false);
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<AgentIdentityVerdict | null>(null);
  // A CHECK THAT THREW answered nothing about any read, so none is drawn done or failed.
  const [unfinished, setUnfinished] = useState(false);
  // THE LATEST CHECK ONLY: an answer to one the person has since left behind
  // (the sheet closed, or Try again) is dropped, never drawn over the next.
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  // FOCUS FOLLOWS THE STEP, as SetupWizard's does: the control pressed
  // (Back, Make it for me) often belongs to the step it leaves, and focus left
  // on it would fall to the page behind the sheet. The step's region takes it,
  // which also says which step this is; the first render takes no focus.
  const region = useRef<HTMLElement>(null);
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    region.current?.focus({ preventScroll: true });
  }, [step]);

  const makeable = make !== undefined && !make.disabledReason;
  const go = (id: AgentIdentitySheetStep) => {
    setStep(id);
    if (STEPS.indexOf(id) > STEPS.indexOf(reached)) setReached(id);
  };

  const check = (byMaking: boolean) => {
    if (running) return;
    const mine = ++run.current;
    setMade(byMaking);
    setVerdict(null);
    setUnfinished(false);
    setRunning(true);
    go('check');
    const brought: AgentIdentityBrought = byMaking
      ? { made: true }
      : {
          made: false,
          ...(handIn.kind === 'file' && file ? { file: file.file } : {}),
          ...(handIn.kind === 'file' && handIn.field && field.trim() ? { field: field.trim() } : {}),
          ...(handIn.kind === 'file' && handIn.detail && detail.trim() ? { detail: detail.trim() } : {}),
          ...(handIn.kind === 'token' && token.trim() ? { token: token.trim() } : {}),
        };
    const settle = (answer: AgentIdentityVerdict, threw = false) => {
      if (run.current !== mine) return;
      setVerdict(answer);
      setUnfinished(threw);
      setRunning(false);
      // THE VALUE IS SENT ONCE: kept nowhere once Crewlet has it, and cleared for a retry.
      if (answer.ok) setToken('');
    };
    let answer: Promise<AgentIdentityVerdict>;
    try {
      answer = onCheck(brought);
    } catch (error) {
      answer = Promise.reject(error);
    }
    answer.then(
      (verdict) => settle(verdict),
      (error: unknown) =>
        settle(
          {
            ok: false,
            view: (
              <Callout variant="danger" title="The check did not finish">
                {messageOf(error) ?? 'Crewlet kept nothing. Try again.'}
              </Callout>
            ),
          },
          true,
        ),
    );
  };

  const again = () => {
    run.current += 1;
    setVerdict(null);
    setUnfinished(false);
    setRunning(false);
    setFile(null);
    setFileError(null);
    setField('');
    setDetail('');
    setToken('');
    const back: AgentIdentitySheetStep = made || handIn.kind === 'nothing' ? 'vendor' : 'back';
    // A FAILED MAKE IS FORGOTTEN: the person may now go by hand, and Back here
    // asks for what they bring rather than saying there is nothing to bring.
    setMade(false);
    setStep(back);
    // THE CHECK IS REACHED ONLY BY RUNNING IT: left reached, the stepper would
    // offer a Check step with nothing under it but a button that never ends.
    setReached(back);
  };

  const pick = (files: PickedFile[]) => {
    const picked = files[0];
    if (!picked || handIn.kind !== 'file') return;
    // A REFUSED OR NEW FILE TAKES THE OLD ONE'S PLACE WHOLE: neither the old
    // file nor the value read from its name is sent under the new one's error.
    if (!accepted(picked.file.name, handIn.accept)) {
      setFileError(`Choose the ${handIn.accept} file ${vendor} gave you.`);
      setFile(null);
      setField('');
      return;
    }
    setFileError(null);
    setFile(picked);
    setField(handIn.field?.fromName?.exec(picked.file.name)?.[1] ?? '');
  };

  const listed = made ? [...(make?.reads ?? []), ...reads] : reads;
  const failed = verdict !== null && !verdict.ok;
  const failedIndex = failed
    ? (() => {
        const at = listed.findIndex((r) => r.id === verdict.failedAt);
        return at >= 0 ? at : listed.length - 1;
      })()
    : -1;
  // NOTHING IS SAID DONE BEFORE THE ANSWER: while the check runs, its first
  // read is the one under way and the rest wait; once it answers, every read
  // before a refusal is done, the refused one failed, and any after it unmade.
  // A check that threw says nothing of any read: each is stopped.
  const readSteps: StepListStep[] = listed.map((r, i) => {
    let state: StepState;
    if (running) state = i === 0 ? 'running' : 'pending';
    else if (!verdict) state = 'pending';
    else if (unfinished) state = 'stopped';
    else if (verdict.ok) state = 'done';
    else state = i < failedIndex ? 'done' : i === failedIndex ? 'failed' : 'pending';
    return { id: r.id, label: r.label, state };
  });

  const vendorSteps = <VendorSteps steps={steps} link={link} />;
  const content: Record<AgentIdentitySheetStep, ReactNode> = {
    vendor: (
      <>
        {caution}
        {make ? (
          <Callout
            variant="info"
            title={make.title}
            action={
              <Button size="small" variant="primary" disabledReason={make.disabledReason} onClick={() => check(true)}>
                {AGENT_IDENTITY_WORDS.makeForMe}
              </Button>
            }
          >
            {make.body}
          </Callout>
        ) : null}
        {makeable ? (
          <Disclosure title={`Or make it by hand at ${vendor}`} size="compact">
            {vendorSteps}
          </Disclosure>
        ) : (
          vendorSteps
        )}
        {note ? (
          <Text as="p" variant="caption" tone="secondary" className="crewlet-agent-identity-sheet__note">
            {note}
          </Text>
        ) : null}
      </>
    ),
    back:
      handIn.kind === 'file' ? (
        <>
          <FormField label="The file" hideLabel error={fileError ?? undefined}>
            <FileDrop
              title={file ? file.file.name : 'Drop the file here'}
              hint={file ? 'Chosen. Crewlet reads it once, then seals it.' : handIn.hint}
              onFiles={pick}
              actions={
                <FilePickButton size="small" variant="secondary" accept={handIn.accept} multiple={false} onFiles={pick}>
                  {file ? 'Choose another file' : 'Choose file'}
                </FilePickButton>
              }
            />
          </FormField>
          {handIn.field ? (
            <FormField label={handIn.field.label} helper={handIn.field.fromName ? "Read from the file's name." : undefined}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  value={field}
                  aria-describedby={describedBy}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setField(e.target.value)}
                />
              )}
            </FormField>
          ) : null}
          {handIn.detail ? (
            <FormField label={handIn.detail.label} optional helper={handIn.detail.hint}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  value={detail}
                  inputMode={handIn.detail?.inputMode}
                  aria-describedby={describedBy}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setDetail(e.target.value)}
                />
              )}
            </FormField>
          ) : null}
        </>
      ) : handIn.kind === 'token' ? (
        <FormField label={handIn.label} helper={handIn.hint}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="password"
              value={token}
              aria-describedby={describedBy}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setToken(e.target.value)}
            />
          )}
        </FormField>
      ) : (
        <Text as="p">{handIn.text}</Text>
      ),
    check: (
      <>
        <StepList label={`Checking ${agent}'s identity at ${vendor}`} steps={readSteps} />
        <div className="crewlet-agent-identity-sheet__verdict" aria-live="polite">
          {verdict?.view}
        </div>
      </>
    ),
  };

  const labels: Record<AgentIdentitySheetStep, { label: string; description: string }> = {
    vendor: { label: `At ${vendor}`, description: makeable ? 'Crewlet can make it' : 'Make it there' },
    back: {
      label: 'Back here',
      description:
        made || handIn.kind === 'nothing'
          ? 'Nothing to bring'
          : handIn.kind === 'file'
            ? 'Choose the file'
            : 'Paste it',
    },
    check: { label: 'Check', description: 'Crewlet reads it and keeps it' },
  };

  const ready =
    handIn.kind === 'file'
      ? file !== null && (!handIn.field || field.trim() !== '')
      : handIn.kind === 'token'
        ? token.trim() !== ''
        : true;
  const notReady =
    handIn.kind === 'file'
      ? file === null
        ? 'Choose the file first.'
        : `Fill in the ${handIn.field?.label ?? 'value'} first.`
      : 'Paste it first.';
  const index = STEPS.indexOf(step);
  const done = verdict?.ok === true;
  // ONE ROW OF THREE PLACES, the primary always the last: the button pressed
  // becomes the next one in place (Check to Done or Try again, when a verdict
  // arrives on the same step), so focus stays on it there.
  const footer = (
    <>
      {!done && (failed || step === 'vendor') ? (
        <Button size="small" variant="ghost" onClick={onClose}>
          Close
        </Button>
      ) : null}
      {!done && index > 0 && !running && !failed ? (
        <Button size="small" variant="ghost" onClick={() => setStep(STEPS[index - 1]!)}>
          Back
        </Button>
      ) : null}
      {done ? (
        <Button size="small" variant="primary" onClick={onClose}>
          Done
        </Button>
      ) : failed ? (
        <Button size="small" variant="primary" onClick={again}>
          Try again
        </Button>
      ) : step === 'vendor' ? (
        // ONE PRIMARY PER VIEW: beside Make it for me, going by hand is the quiet choice.
        <Button size="small" variant={makeable ? 'secondary' : 'primary'} onClick={() => go('back')}>
          {makeable ? 'I made it by hand' : 'Next'}
        </Button>
      ) : step === 'back' ? (
        <Button
          size="small"
          variant="primary"
          disabledReason={ready ? undefined : notReady}
          onClick={() => check(false)}
        >
          Check
        </Button>
      ) : (
        <Button size="small" variant="primary" loading>
          Check
        </Button>
      )}
    </>
  );

  return (
    <Dialog
      open
      variant="sheet"
      size="md"
      stackBody
      onClose={onClose}
      title={`${replacing ? AGENT_IDENTITY_WORDS.replace : AGENT_IDENTITY_WORDS.setUp}: ${agent}`}
      subtitle={why}
      footer={footer}
      className="crewlet-agent-identity-sheet"
    >
      <Stepper
        orientation="vertical"
        label={`Setting up ${agent}'s identity at ${vendor}`}
        steps={STEPS.map((id) => ({ id, ...labels[id] }))}
        current={done ? null : step}
        tone={failed ? 'danger' : 'info'}
        reached={reached}
        onSelect={running || verdict ? undefined : (id) => setStep(id as AgentIdentitySheetStep)}
      />
      <section
        ref={region}
        tabIndex={-1}
        className="crewlet-agent-identity-sheet__step"
        aria-label={labels[step].label}
      >
        {content[step]}
      </section>
    </Dialog>
  );
}

/** The vendor's steps, numbered, each value to copy under its own step, and the vendor's page where no step names it. */
function VendorSteps({
  steps,
  link,
}: {
  steps: readonly AgentIdentityVendorStep[];
  link: { label: string; href: string } | undefined;
}) {
  return (
    <>
      <List variant="numbered" className="crewlet-agent-identity-sheet__steps">
        {steps.map((s, i) => (
          <ListItem key={i}>
            {s.copy ? (
              <span className="crewlet-agent-identity-sheet__copy">
                <span>{s.text}</span>
                <Copyable variant="block" monospace value={s.copy.value} ariaLabel={`Copy the ${s.copy.label}`} />
                {s.copy.rule ? (
                  <Text variant="caption" tone="secondary">
                    {s.copy.rule}
                  </Text>
                ) : null}
              </span>
            ) : (
              s.text
            )}
          </ListItem>
        ))}
      </List>
      {link ? (
        <span className="crewlet-agent-identity-sheet__link">
          <ButtonLink size="small" variant="secondary" href={link.href} external>
            {link.label}
          </ButtonLink>
        </span>
      ) : null}
    </>
  );
}
