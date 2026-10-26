import { useId, useState, type ReactNode } from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { XGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import { CopyButton } from '../Copyable/index.js';
import { IconButton } from '../IconButton/index.js';
import { Modal } from '../Modal/index.js';
import { PrincipalAvatar, type Principal } from '../Principal/index.js';
import { Select, type SelectOption } from '../Select/index.js';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel } from '../utils/headingLevel.js';
import { useMediaMatch } from '../MediaMatch/index.js';
import { SHAREABLE_ROLES, type ArtifactRole, type CompanyAccess, type ShareableRole } from './roles.js';

/** One line of "Who has access". */
export interface ShareAudienceRow {
  /** Stable for the row: the share's id, or the principal's key for an effective row. */
  id: string;
  principal: Principal;
  role: ArtifactRole;
  /** The reader's own row, drawn with "(you)". */
  self?: boolean | undefined;
  /**
   * Access this principal holds THROUGH something else ("Through Operations",
   * "Everyone in Acme"). An effective row is not a share: it carries no role
   * control and no remove, because changing it means changing what it is
   * through.
   */
  via?: string | undefined;
  /** A change to this row is in flight; the row says so until the engine answers. */
  pending?: boolean | undefined;
  /** The engine refused the last change to this row, in words ("Only a person can share with the whole company."). */
  refusal?: string | undefined;
  /** The role can be changed here. Defaults to true for a direct share that is not the owner. */
  editable?: boolean | undefined;
  /** The row can be removed here. Defaults to `editable`. */
  removable?: boolean | undefined;
  /** A line under the row. An agent's row says what the agent may do with its role when this is left out. */
  note?: string | undefined;
  /**
   * Why this share reaches nobody, in words ("token:maya is a sign-in, not a
   * seat. Remove it and share with their seat."). A stored share the engine
   * can no longer honour is LISTED, not hidden, so its owner sees it and takes
   * it away: the row says so in the warning ink in place of its note, reads
   * `labels.noAccess` in place of a role, and offers Remove as its one action.
   */
  invalid?: string | undefined;
}

export interface ShareDialogLabels {
  title: (artifact: string) => string;
  addRole: string;
  audience: string;
  you: string;
  roles: Record<ArtifactRole, string>;
  roleDescriptions: Record<ArtifactRole, string>;
  roleFor: (name: string) => string;
  remove: (name: string) => string;
  /** What an invalid row ([ShareAudienceRow.invalid]) reads in place of its role. */
  noAccess: string;
  saving: string;
  /** Why a row's controls wait while its change is in flight. */
  busy: string;
  /** What an agent may do in its turns with each role. */
  agentNote: (name: string, role: ArtifactRole) => string;
  companyAccess: string;
  company: (company: string, access: CompanyAccess) => string;
  copyLink: string;
  linkCopied: string;
  linkNote: string;
  done: string;
}

const AGENT_CAN: Record<ArtifactRole, string> = {
  viewer: 'read this artifact in its turns',
  commenter: 'read this artifact and comment on it in its turns',
  contributor: 'read this artifact in its turns and edit its data',
  editor: 'read this artifact, edit its data and publish versions in its turns',
  owner: 'read, edit, publish and share this artifact in its turns',
};

const LABELS: ShareDialogLabels = {
  // Curly quotes, as every other dialog title in the product draws them.
  title: (artifact) => `Share “${artifact}”`,
  addRole: 'Role for people you add',
  audience: 'Who has access',
  you: '(you)',
  roles: { viewer: 'Viewer', commenter: 'Commenter', contributor: 'Contributor', editor: 'Editor', owner: 'Owner' },
  roleDescriptions: {
    viewer: 'Reads the artifact, its versions and its history',
    commenter: 'Also comments',
    contributor: 'Also edits its data',
    editor: 'Also publishes versions and changes the schema',
    owner: 'Also shares, trashes and transfers it',
  },
  roleFor: (name) => `Role for ${name}`,
  remove: (name) => `Remove ${name}`,
  noAccess: 'No access',
  saving: 'Saving',
  busy: 'Wait for the change to finish.',
  agentNote: (name, role) => `${name} can ${AGENT_CAN[role]}.`,
  companyAccess: 'Company access',
  company: (company, access) => {
    switch (access) {
      case 'none':
        return 'Only people with access above';
      case 'viewer':
        return `Everyone in ${company} can view`;
      case 'commenter':
        return `Everyone in ${company} can comment`;
      case 'contributor':
        return `Everyone in ${company} can edit its data`;
      case 'editor':
        return `Everyone in ${company} can edit`;
    }
  },
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  linkNote: 'Only people with access can open the link.',
  done: 'Done',
};

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  /** The artifact's title, named in the dialog's own. */
  title: string;
  /**
   * The grantee search, given the role the reader chose for whoever they add.
   * A `PrincipalPicker` wired to the engine's search, as a rule: picking
   * somebody there is the add, at that role.
   */
  picker?: ((context: { role: ShareableRole }) => ReactNode) | undefined;
  /** The role a new grantee starts at. The least by default. */
  defaultAddRole?: ShareableRole | undefined;
  /** The roles this reader may grant, in ladder order. Every shareable role by default. */
  grantableRoles?: readonly ShareableRole[] | undefined;
  audience: readonly ShareAudienceRow[];
  onRoleChange?: ((row: ShareAudienceRow, role: ShareableRole) => void) | undefined;
  onRemove?: ((row: ShareAudienceRow) => void) | undefined;
  companyName: string;
  companyAccess: CompanyAccess;
  onCompanyAccessChange?: ((access: CompanyAccess) => void) | undefined;
  companyPending?: boolean | undefined;
  companyRefusal?: string | undefined;
  /** The artifact's address inside the dashboard. Access is still the engine's decision on every open. */
  link?: string | undefined;
  /** The reader may see who has access but not change it. The reason is said in place of every control. */
  readOnly?: { reason: string } | undefined;
  /** A line above everything else: "You can manage this because you are an administrator." */
  note?: ReactNode;
  labels?: Partial<ShareDialogLabels> | undefined;
}

/**
 * Who can open an artifact, and at what role, with the controls to change it.
 *
 * CHANGES ARE CONFIRMED, NOT OPTIMISTIC. A role change or a removal is asked
 * of the engine and the row shows it is saving until the engine answers; a
 * refusal is said on the row it belongs to, in the engine's words. Nothing
 * here pretends a share happened before it did.
 *
 * A READER WHO CANNOT SHARE STILL SEES WHO CAN OPEN IT. The dialog opens in
 * read mode with the reason, every role as words, and no control: a write is
 * never hidden, and neither is the audience.
 *
 * Owner is not offered by any control: it moves only by transfer, in the
 * artifact's settings.
 */
export function ShareDialog({
  open,
  onClose,
  title,
  picker,
  defaultAddRole = 'viewer',
  grantableRoles = SHAREABLE_ROLES,
  audience,
  onRoleChange,
  onRemove,
  companyName,
  companyAccess,
  onCompanyAccessChange,
  companyPending = false,
  companyRefusal,
  link,
  readOnly,
  note,
  labels,
}: ShareDialogProps) {
  const text = {
    ...LABELS,
    ...labels,
    roles: { ...LABELS.roles, ...labels?.roles },
    roleDescriptions: { ...LABELS.roleDescriptions, ...labels?.roleDescriptions },
  };
  const phone = useMediaMatch(`(width < ${breakpoint.phone})`);
  const [addRole, setAddRole] = useState<ShareableRole>(defaultAddRole);
  const level = useHeadingLevel();
  const Heading = headingTag(level);
  const audienceId = useId();
  const companyId = useId();

  const roleOptions: SelectOption[] = grantableRoles.map((role) => ({
    value: role,
    label: text.roles[role],
    description: text.roleDescriptions[role],
  }));
  const companyOptions: SelectOption[] = (['none', ...grantableRoles] as const).map((access) => ({
    value: access,
    label: text.company(companyName, access),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.title(title)}
      placement={phone ? 'bottom' : 'top'}
      size="md"
      stackBody
      footerStart={
        link ? (
          <span className="crewlet-share-dialog__link">
            {/* At the foot's own button step, so it stands as tall as Done on the same row. */}
            <CopyButton text={link} label={text.copyLink} copiedLabel={text.linkCopied} copiedMessage={text.linkCopied} size="medium" variant="outline" />
            <span className="crewlet-share-dialog__link-note">{text.linkNote}</span>
          </span>
        ) : undefined
      }
      footer={
        <Button variant="primary" onClick={onClose}>
          {text.done}
        </Button>
      }
    >
      {note ? <Callout variant="info">{note}</Callout> : null}
      {readOnly ? <Callout variant="neutral">{readOnly.reason}</Callout> : null}

      {!readOnly && picker ? (
        <div className="crewlet-share-dialog__add">
          {picker({ role: addRole })}
          <Select
            value={addRole}
            options={roleOptions}
            onChange={(value) => setAddRole(value as ShareableRole)}
            ariaLabel={text.addRole}
            size="md"
            // On a phone the add row stacks (ShareDialog.css), and the role
            // takes the field's full width under it rather than a toolbar
            // picker's 220px cap.
            width={phone ? 'full' : 'auto'}
            align="right"
          />
        </div>
      ) : null}

      <section className="crewlet-share-dialog__section" aria-labelledby={audienceId}>
        <Heading id={audienceId} className="crewlet-share-dialog__heading">
          {text.audience}
        </Heading>
        <ul className="crewlet-share-dialog__audience">
          {audience.map((row) => {
            const direct = row.via === undefined && row.role !== 'owner';
            const invalid = row.invalid !== undefined && row.invalid !== '';
            const editable = !invalid && !readOnly && onRoleChange !== undefined && (row.editable ?? direct);
            const removable =
              !readOnly && onRemove !== undefined && (invalid ? (row.removable ?? true) : (row.removable ?? (row.editable ?? direct)));
            const rowNote = invalid
              ? undefined
              : (row.note ?? (row.principal.kind === 'agent' ? text.agentNote(row.principal.name, row.role) : undefined));
            const detail = row.via ?? row.principal.detail;
            return (
              <li
                key={row.id}
                className={cx('crewlet-share-dialog__row', row.pending && 'is-pending', invalid && 'is-invalid')}
                aria-busy={row.pending || undefined}
              >
                <PrincipalAvatar principal={row.principal} size="md" />
                <span className="crewlet-share-dialog__who">
                  <span className="crewlet-share-dialog__name">
                    {row.principal.name}
                    {row.self ? <span className="crewlet-share-dialog__you"> {text.you}</span> : null}
                  </span>
                  {detail ? <span className="crewlet-share-dialog__detail">{detail}</span> : null}
                </span>
                <span className="crewlet-share-dialog__controls">
                  {row.pending ? <span className="crewlet-share-dialog__saving">{text.saving}</span> : null}
                  {editable && row.role !== 'owner' ? (
                    <Select
                      value={row.role}
                      options={roleOptions}
                      onChange={(value) => onRoleChange(row, value as ShareableRole)}
                      ariaLabel={text.roleFor(row.principal.name)}
                      disabled={row.pending ?? false}
                      size="sm"
                      width="auto"
                      align="right"
                    />
                  ) : (
                    <span className="crewlet-share-dialog__role">{invalid ? text.noAccess : text.roles[row.role]}</span>
                  )}
                  {removable ? (
                    <IconButton
                      label={text.remove(row.principal.name)}
                      icon={<XGlyph />}
                      size="sm"
                      variant="ghost"
                      disabledReason={row.pending ? text.busy : undefined}
                      onClick={() => onRemove(row)}
                    />
                  ) : null}
                </span>
                {rowNote ? <span className="crewlet-share-dialog__note">{rowNote}</span> : null}
                {invalid ? <span className="crewlet-share-dialog__invalid">{row.invalid}</span> : null}
                <span className="crewlet-share-dialog__refusal" aria-live="polite">
                  {row.refusal ?? ''}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="crewlet-share-dialog__section" aria-labelledby={companyId} aria-busy={companyPending || undefined}>
        <Heading id={companyId} className="crewlet-share-dialog__heading">
          {text.companyAccess}
        </Heading>
        {readOnly || !onCompanyAccessChange ? (
          <p className="crewlet-share-dialog__company-text">{text.company(companyName, companyAccess)}</p>
        ) : (
          <span className="crewlet-share-dialog__company">
            <Select
              value={companyAccess}
              options={companyOptions}
              onChange={(value) => onCompanyAccessChange(value as CompanyAccess)}
              ariaLabel={text.companyAccess}
              disabled={companyPending}
              size="md"
            />
            {companyPending ? <span className="crewlet-share-dialog__saving">{text.saving}</span> : null}
          </span>
        )}
        <span className="crewlet-share-dialog__refusal" aria-live="polite">
          {companyRefusal ?? ''}
        </span>
      </section>
    </Modal>
  );
}
