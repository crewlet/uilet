import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AddPill,
  Button,
  IconButton,
  Menu,
  OrgNodeDisclosure,
  OrgNodeLabel,
  OrgNodeLead,
  TreeCanvas,
  type TreeCardContext,
  type TreeCardInput,
  type TreeCardTone,
  type TreeInput,
  type TreeModel,
} from '@crewlethq/ui';
import { CrewletFigure } from '@crewlethq/icons';
import {
  AccountTreeGlyph,
  AddGlyph,
  ApartmentGlyph,
  ChevronRightGlyph,
  CreateNewFolderGlyph,
  DeleteGlyph,
  EditGlyph,
  KeyboardArrowDownGlyph,
  PersonAddGlyph,
  PersonGlyph,
} from '@crewlethq/icons/glyphs';

/**
 * UI / TreeCanvas.
 *
 * A hierarchy drawn as cards on a canvas, with the ARIA tree pattern over it.
 * The component owns the layout, the connectors, the keys and focus; the cards
 * are yours to draw.
 *
 * Try it: arrows walk the visible order, Right and Left open, close and climb,
 * Home and End jump, typing a name finds a node, and the ContextMenu key or
 * Shift+F10 opens the focused node's menu. Every button you can see is out of
 * the tab order on purpose.
 */
const meta: Meta<typeof TreeCanvas> = {
  title: 'UI/TreeCanvas',
  component: TreeCanvas,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TreeCanvas>;

type Kind = 'company' | 'unit' | 'seat';
interface Entity {
  name: string;
  kind: Kind;
  parent: string | null;
  /** A human seat is drawn with the dashed edge every human seat has. */
  human?: boolean;
}

const COMPANY = 'company:nimbus';
const ENTITIES: Record<string, Entity> = {
  [COMPANY]: { name: 'Nimbus', kind: 'company', parent: null },
  'seat:ceo': { name: 'Chief Executive', kind: 'seat', parent: COMPANY, human: true },
  'unit:eng': { name: 'Engineering', kind: 'unit', parent: COMPANY },
  'seat:vp': { name: 'VP Engineering', kind: 'seat', parent: 'unit:eng' },
  'seat:dev': { name: 'Software Engineer', kind: 'seat', parent: 'unit:eng' },
  'unit:platform': { name: 'Platform', kind: 'unit', parent: 'unit:eng' },
  'seat:sre': { name: 'Reliability', kind: 'seat', parent: 'unit:platform' },
  'seat:dx': { name: 'Developer Experience', kind: 'seat', parent: 'unit:platform' },
  'unit:sales': { name: 'Sales', kind: 'unit', parent: COMPANY },
  'seat:ae': { name: 'Account Executive', kind: 'seat', parent: 'unit:sales', human: true },
};

const NODES: TreeInput[] = (function build() {
  const node = (id: string): TreeInput => ({
    id,
    label: ENTITIES[id]!.name,
    children: Object.keys(ENTITIES)
      .filter((child) => ENTITIES[child]!.parent === id)
      .map(node),
  });
  return [node(COMPANY)];
})();

/** A seat inside a unit is a ROW of that unit's card; everything else is a card. */
const cardOf = (id: string) => {
  const entity = ENTITIES[id]!;
  return entity.kind === 'seat' && entity.parent !== null && entity.parent !== COMPANY ? entity.parent : id;
};

function cards(model: TreeModel, expanded: ReadonlySet<string>): TreeCardInput[] {
  const card = (id: string): TreeCardInput => {
    if (!expanded.has(id)) return { id, children: [] };
    const kids = model.children.get(id) ?? [];
    if (ENTITIES[id]!.kind === 'company') return { id, children: kids.map(card) };
    if (ENTITIES[id]!.kind === 'unit') {
      return { id, children: kids.filter((kid) => ENTITIES[kid]!.kind !== 'seat').map(card) };
    }
    return { id, children: [] };
  };
  return model.roots.map(card);
}

/*
 * THE FRAME IS NOT HERE ANY MORE. The surface, the boundary, the radius, the
 * lift, the dashed edge of a human seat and the accent ring on the selected
 * node were all spelled out in this file, which is how two charts in one
 * product came to draw four different cards. TreeCanvas draws the card and the
 * two states a node can be in; `cardOutline` is what says a card stands for
 * somebody outside the system. What is left here is what a card SAYS.
 *
 * The pointer's controls are not drawn here either: `card.actions(id)` is the
 * whole of the strip beside a node and `renderUnder` is what hangs below a
 * card, and WHERE each sits and WHEN it appears are the chart's, so a name has
 * the card's whole width at rest on every chart rather than on the ones whose
 * author thought of it.
 */
const body: CSSProperties = {
  fontSize: 'var(--font-size-compact)',
};

const metaText: CSSProperties = {
  fontSize: 'var(--font-size-2xs)',
  color: 'var(--color-text-tertiary)',
};

function Card({ id, card }: { id: string; card: TreeCardContext }) {
  const entity = ENTITIES[id]!;
  const open = card.expanded(id);
  const rows =
    entity.kind === 'unit' && open
      ? Object.keys(ENTITIES).filter((child) => ENTITIES[child]!.parent === id && ENTITIES[child]!.kind === 'seat')
      : [];
  return (
    <>
      <div {...card.item(id)} style={body}>
        <span>{entity.name}</span>
        <span style={metaText}>
          {entity.kind === 'company' ? 'Company' : entity.kind === 'unit' ? 'Unit' : entity.human ? 'Human seat' : 'Agent seat'}
        </span>
      </div>
      {/* THE DISCLOSURE IS ON THE CARD'S LEADING EDGE, never on the branch
          below: the branch is where the add hangs, and an add pill splits open
          over whatever is beside it. In the actions column it was a THIRD cell
          of a two-cell column, which is 16px on one rank, under the pointer
          target floor at every density. Beside the treeitem rather than in it,
          because a tree's items hold nothing focusable. */}
      {card.expandable(id) && (
        // The press goes to the NODE, as it does from every other control on a
        // card: focus afterwards is always a node the arrows can move from.
        <OrgNodeDisclosure {...card.press(id)}>
          <IconButton
            size="sm"
            label={`${open ? 'Collapse' : 'Expand'} ${entity.name}`}
            icon={open ? <KeyboardArrowDownGlyph /> : <ChevronRightGlyph />}
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              card.toggle(id);
            }}
          />
        </OrgNodeDisclosure>
      )}
      <div {...card.actions(id)}>
        <Menu
          label={`Actions for ${entity.name}`}
          items={[
            { key: 'edit', label: 'Edit', onSelect: () => {} },
            { key: 'move', label: 'Move to', onSelect: () => {} },
            { kind: 'separator', key: 'sep' },
            { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
          ]}
          triggerTabIndex={-1}
          open={card.menuOpen(id)}
          onOpenChange={(value) => card.setMenuOpen(id, value)}
        />
      </div>
      {rows.length > 0 && (
        <div
          role="none"
          style={{
            display: 'grid',
            gap: 'var(--spacing-1)',
            padding: 'var(--spacing-1)',
            borderTop: '1px solid var(--color-border-default)',
          }}
        >
          {rows.map((row) => (
            <div
              key={row}
              role="none"
              style={{
                border: `1px ${ENTITIES[row]!.human ? 'dashed' : 'solid'} ${ENTITIES[row]!.human ? 'var(--color-border-default)' : 'transparent'}`,
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div {...card.item(row)} style={body}>
                <span>{ENTITIES[row]!.name}</span>
                <span style={metaText}>{ENTITIES[row]!.human ? 'Human seat' : 'Agent seat'}</span>
              </div>
              <div {...card.actions(row)}>
                <Menu
                  label={`Actions for ${ENTITIES[row]!.name}`}
                  items={[{ key: 'edit', label: 'Edit', onSelect: () => {} }]}
                  triggerTabIndex={-1}
                  open={card.menuOpen(row)}
                  onOpenChange={(value) => card.setMenuOpen(row, value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Chart({ note }: { note?: string }) {
  const [selected, setSelected] = useState<string | null>('seat:dev');
  return (
    <div style={{ height: '70vh', padding: 'var(--spacing-4)' }}>
      <TreeCanvas
        label="Structure chart"
        nodes={NODES}
        cards={cards}
        cardOf={cardOf}
        renderCard={(id, card) => <Card id={id} card={card} />}
        renderUnder={(id) =>
          ENTITIES[id]!.kind === 'seat' ? null : (
            <Button size="small" variant="tertiary" tabIndex={-1} leadingIcon={<AddGlyph />}>
              Add
            </Button>
          )
        }
        cardOutline={(id) => ENTITIES[id]?.human === true}
        hasNodeMenu={() => true}
        onNodeKey={() => true}
        selectedId={selected}
        onSelect={setSelected}
        overlay={
          note ? (
            <p
              style={{
                position: 'absolute',
                inset: 'var(--spacing-2) var(--spacing-2) auto',
                margin: 0,
                padding: 'var(--spacing-1) var(--spacing-2)',
                fontSize: 'var(--font-size-2xs)',
                color: 'var(--color-text-tertiary)',
                background: 'var(--color-surface-glass)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                // The overlay layer is inert and its children are not, so a
                // note that must not swallow the drag says so itself.
                pointerEvents: 'none',
              }}
            >
              {note}
            </p>
          ) : undefined
        }
      />
    </div>
  );
}

/**
 * Dashed cards for the human seats, one selected node, and a menu in the
 * overlay that the zoom neither scales nor clips.
 *
 * Every frame on this canvas is the component's: the card, its dashed variant,
 * the inset on each node, the accent ring on the selected one and the ring a
 * keyboard leaves behind it. The canvas stands on the page's own ground so the
 * cards read as objects on a field rather than as one sheet, and the connectors
 * curve from each parent's bottom into each child's top, dark enough to be
 * measured rather than the hairline they were.
 *
 * At rest the chart is cards and connectors: point at one and its controls
 * appear over the card's end, and the control that adds a child appears on the
 * branch below it. That is why a name here has the whole card to say itself in
 * rather than the half left beside three buttons nobody is pointing at.
 *
 * Switch the toolbar's density and the cards tighten with the page: the insets
 * inside a card and the gaps between them are measured from spacing tokens, so
 * a comfortable chart is not a compact one with more air between the words.
 */
export const Default: Story = { render: () => <Chart /> };

/** With a note about what the chart is showing, drawn over the viewport. */
export const WithANote: Story = {
  render: () => <Chart note="These reporting lines are from the last check." />,
};

/* -------------------------------------------------------------------------
 * The `node` appearance: the same chart drawn as an org chart.
 * ---------------------------------------------------------------------- */

/** Which of the six hues an agent seat carries, from its own id. */
const TONES: TreeCardTone[] = ['purple', 'cyan', 'green', 'amber', 'rose', 'blue'];
const toneOf = (id: string): TreeCardTone | undefined => {
  const entity = ENTITIES[id]!;
  if (entity.kind !== 'seat' || entity.human === true) return undefined;
  let hash = 0;
  for (const code of id) hash = (hash * 31 + code.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
};

const LEADS: Record<string, string> = {
  'unit:eng': 'VP Engineering',
  'unit:platform': 'Reliability',
};

function NodeCard({ id, card }: { id: string; card: TreeCardContext }) {
  const entity = ENTITIES[id]!;
  const open = card.expanded(id);
  const icon =
    entity.kind === 'company' ? (
      <ApartmentGlyph />
    ) : entity.kind === 'unit' ? (
      <AccountTreeGlyph />
    ) : entity.human === true ? (
      <PersonGlyph size="sm" />
    ) : (
      <CrewletFigure motion="idle" />
    );
  return (
    <>
      <div {...card.item(id)}>
        <OrgNodeLabel
          icon={icon}
          iconRing={entity.human === true ? 'dashed' : 'none'}
          name={entity.name}
          caption={
            entity.kind === 'company'
              ? 'Company'
              : entity.kind === 'unit'
                ? 'Unit'
                : entity.human === true
                  ? 'Human'
                  : 'Crewlet agent'
          }
        />
      </div>
      {/* THE DISCLOSURE IS ON THE CARD'S LEADING EDGE, never on the branch
          below: the branch is where the add hangs, and an add pill splits open
          over whatever is beside it. In the actions column it was a THIRD cell
          of a two-cell column, which is 16px on one rank, under the pointer
          target floor at every density. Beside the treeitem rather than in it,
          because a tree's items hold nothing focusable. */}
      {card.expandable(id) && (
        // The press goes to the NODE, as it does from every other control on a
        // card: focus afterwards is always a node the arrows can move from.
        <OrgNodeDisclosure {...card.press(id)}>
          <IconButton
            size="sm"
            label={`${open ? 'Collapse' : 'Expand'} ${entity.name}`}
            icon={open ? <KeyboardArrowDownGlyph /> : <ChevronRightGlyph />}
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              card.toggle(id);
            }}
          />
        </OrgNodeDisclosure>
      )}
      <div {...card.actions(id)}>
        <Menu
          label={`Actions for ${entity.name}`}
          icon={<EditGlyph />}
          items={[{ key: 'edit', label: 'Edit', onSelect: () => {} }]}
          triggerTabIndex={-1}
        />
        <Menu
          label={`Delete ${entity.name}`}
          icon={<DeleteGlyph />}
          items={[{ key: 'delete', label: 'Delete', danger: true, onSelect: () => {} }]}
          triggerTabIndex={-1}
          open={card.menuOpen(id)}
          onOpenChange={(value) => card.setMenuOpen(id, value)}
        />
      </div>
      {entity.kind === 'unit' && (
        <div aria-hidden="true" {...card.press(id)}>
          <OrgNodeLead empty={LEADS[id] === undefined}>
            {LEADS[id] === undefined ? 'Lead' : `Lead: ${LEADS[id]}`}
          </OrgNodeLead>
        </div>
      )}
    </>
  );
}

/** Every seat is a node of its own here, so nothing is drawn as a row. */
function nodeCards(model: TreeModel, expanded: ReadonlySet<string>): TreeCardInput[] {
  const card = (id: string): TreeCardInput => ({
    id,
    children: expanded.has(id) ? (model.children.get(id) ?? []).map(card) : [],
  });
  return model.roots.map(card);
}

/**
 * The console's own org chart, as this package draws it.
 *
 * A node is one rank tall and as wide as its own name, between a fixed icon
 * zone and a fixed actions column; the branches are single cubics leaving each
 * parent's bottom edge; an agent seat carries one of the six node hues, which
 * reaches its fill, its edge, the halo outside it, its name and the branch
 * arriving at it; a unit says who leads it along its bottom edge, or draws the
 * outline of a pill where a lead would go; and the control that adds a child is
 * a quiet disc on the branch below, drawn at a third of a node's height and hit
 * at a whole pointer target, which splits into the kinds it can add when you
 * point at it.
 *
 * The branch below a node carries that add and nothing else, which is what the
 * console chart draws there. A chart that can COLLAPSE owes a reader a control
 * for it as well, and it is on the card's leading edge, straddling the
 * boundary the way the add straddles the bottom one: on the branch the two
 * were a pair fighting over one place, and a pill splitting open covered the
 * chevron a reader had just reached for. It is drawn BESIDE the treeitem, like
 * every other control on a card, because a tree's items hold nothing
 * focusable; collapsing is still on the item itself, as Right and Left.
 *
 * Every card of a depth sits on one line, because a rank of an organization is
 * a row a reader scans across; the chart arrives rank by rank, and adding a
 * seat moves the cards rather than replacing them. Ask your system for reduced
 * motion and the chart is drawn whole, with every relayout a jump.
 *
 * Everything the `card` appearance guarantees is still here: the tree pattern
 * and its keys, the roving tab stop, the focus ring drawn inside the clipping
 * viewport, the reveal of every pointer-only control by focus as well as by
 * hover, and the dashed boundary on a seat nobody inside the system holds.
 */
export const OrgChart: Story = {
  render: function OrgChartStory() {
    const [selected, setSelected] = useState<string | null>('seat:dev');
    return (
      <div style={{ height: '70vh', padding: 'var(--spacing-4)' }}>
        <TreeCanvas
          label="Structure chart"
          appearance="node"
          connector="curve"
          nodes={NODES}
          cards={nodeCards}
          cardOf={(id) => id}
          cardTone={toneOf}
          renderCard={(id, card) => <NodeCard id={id} card={card} />}
          renderUnder={(id) =>
            ENTITIES[id]!.kind === 'seat' ? null : (
              <AddPill
                label={`Add to ${ENTITIES[id]!.name}`}
                tabIndex={-1}
                sections={[
                  {
                    key: 'unit',
                    label: 'Add a unit',
                    icon: <CreateNewFolderGlyph />,
                    onSelect: () => {},
                  },
                  {
                    key: 'agent',
                    label: 'Add an agent seat',
                    icon: <CrewletFigure />,
                    onSelect: () => {},
                  },
                  {
                    key: 'human',
                    label: 'Add a human seat',
                    icon: <PersonAddGlyph />,
                    onSelect: () => {},
                  },
                ]}
              />
            )
          }
          cardOutline={(id) => ENTITIES[id]?.human === true}
          hasNodeMenu={() => true}
          onNodeKey={() => true}
          selectedId={selected}
          onSelect={setSelected}
        />
      </div>
    );
  },
};

/**
 * Adding a node IN the chart rather than in a dialog over it.
 *
 * Point at any unit's branch, pick a kind from the pill, and the chart makes
 * room in the rank the new node will land in, reaches the branch into that
 * place, eases onto it and draws the form there. Escape cancels; focus goes
 * into the form when it opens and back to the node it was added to when it
 * closes.
 *
 * The ghost is a card of the LAYOUT and not a node of the DATA: walk the chart
 * with the arrows while it is open and nothing lands on it, and no unit's
 * `aria-setsize` counts it. Ask your system for reduced motion and every part
 * of that still happens, drawn in place, with no arrival and no breath.
 */
export const AddingANode: Story = {
  render: function AddingANodeStory() {
    const [adding, setAdding] = useState<string | null>(null);
    const [name, setName] = useState('');
    return (
      <div style={{ height: '70vh', padding: 'var(--spacing-4)' }}>
        <TreeCanvas
          label="Structure chart"
          appearance="node"
          connector="curve"
          nodes={NODES}
          cards={nodeCards}
          cardOf={(id) => id}
          cardTone={toneOf}
          renderCard={(id, card) => <NodeCard id={id} card={card} />}
          renderUnder={(id) =>
            ENTITIES[id]!.kind === 'seat' ? null : (
              <AddPill
                label={`Add to ${ENTITIES[id]!.name}`}
                tabIndex={-1}
                sections={[
                  {
                    key: 'unit',
                    label: 'Add a unit',
                    icon: <CreateNewFolderGlyph />,
                    onSelect: () => {
                      setName('');
                      setAdding(id);
                    },
                  },
                  {
                    key: 'agent',
                    label: 'Add an agent seat',
                    icon: <CrewletFigure />,
                    onSelect: () => {
                      setName('');
                      setAdding(id);
                    },
                  },
                ]}
              />
            )
          }
          cardOutline={(id) => ENTITIES[id]?.human === true}
          hasNodeMenu={() => true}
          onNodeKey={() => true}
          composing={
            adding === null
              ? null
              : {
                  id: 'ghost:new',
                  parent: adding,
                  label: `Add to ${ENTITIES[adding]!.name}`,
                  onCancel: () => setAdding(null),
                  render: () => (
                    <form
                      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        setAdding(null);
                      }}
                    >
                      <strong>Add to {ENTITIES[adding]!.name}</strong>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                        Name
                        <input value={name} onChange={(event) => setName(event.target.value)} />
                      </label>
                      <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
                        <Button variant="tertiary" onClick={() => setAdding(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                          Add
                        </Button>
                      </div>
                    </form>
                  ),
                }
          }
        />
      </div>
    );
  },
};
