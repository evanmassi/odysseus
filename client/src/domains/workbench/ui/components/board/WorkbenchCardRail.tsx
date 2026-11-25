import { Fragment, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useShowCard } from '../../../hooks/useShowCard';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { CARD_TYPES } from '../../../utils/cards/cardTypes';
import { cardsShowing, openCard, type CardTarget } from '../../../utils/cards/createCard';
import {
  removalMessage,
  removalTitle,
  type RemovableType,
} from '../../../utils/cards/permanentRemoval';
import {
  newFlowCytometryPanel,
  removeFlowCytometryPanel,
} from '../../../utils/flowCytometry/flowCytometryPanel';
import { newPlateMap, removePlateMap } from '../../../utils/plateMap/plateMapEdits';
import {
  plateNameOf,
  otherLabwareTabNameOf,
  plateMapTabs,
  labwareTitle,
} from '../../../utils/plateMap/plateMapTabs';

import { CARD_ICONS } from './cardIcons';
import { CARD_PANELS } from './cardPanels';
import { RAIL_HEADING } from './cardRailStyles';
import { WorkbenchCardRailItem } from './WorkbenchCardRailItem';
import {
  WorkbenchCardRailShowMenu,
  type RailShownEntry,
  type RailShownSection,
} from './WorkbenchCardRailShowMenu';

import type {
  FlowCytometryPanel,
  PlateMap,
  Protocol,
  ProtocolCard,
  ProtocolCardType,
  ProtocolPage,
} from '@odysseus/shared-schemas';

const RAIL_GROUPS: ReadonlyArray<[string, ProtocolCardType[]]> = [
  ['Inputs', ['materials', 'flowCytometryPanel']],
  ['Write', ['procedure', 'flowDiagram']],
  ['Numbers', ['values', 'calculations', 'dilutions']],
  ['Layout', ['plateMap']],
];

const NOT_SHOWN = 'Not shown';

const tabNames = (plateMap: PlateMap) =>
  plateMapTabs(plateMap)
    .map(tab =>
      tab.kind === 'plate' ? plateNameOf(plateMap, tab.plate) : otherLabwareTabNameOf(plateMap)
    )
    .join(', ');

const plateMapEntry = (plateMap: PlateMap): RailShownEntry => ({
  id: plateMap.id,
  label: labwareTitle(plateMap),
  hint: tabNames(plateMap),
});

const panelEntry = (panel: FlowCytometryPanel): RailShownEntry => ({
  id: panel.id,
  label: panel.title,
  hint: [
    panel.cytometer?.name ?? 'No cytometer picked',
    `${panel.markers.length} ${panel.markers.length === 1 ? 'marker' : 'markers'}`,
  ].join(' · '),
});

function shownSections(
  entries: readonly RailShownEntry[],
  pages: readonly ProtocolPage[],
  cards: readonly ProtocolCard[]
): RailShownSection[] {
  const isOn = (entry: RailShownEntry, pageId: string) =>
    cardsShowing(cards, entry.id).some(card => card.page === pageId);
  return [
    ...pages.map(page => ({
      id: page.id,
      heading: page.name,
      entries: entries.filter(entry => isOn(entry, page.id)),
      canRemove: false,
    })),
    {
      id: NOT_SHOWN,
      heading: NOT_SHOWN,
      entries: entries.filter(entry => !cardsShowing(cards, entry.id).length),
      canRemove: true,
    },
  ].filter(section => section.entries.length);
}

export function WorkbenchCardRail() {
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const pages = useWorkbenchStore(state => state.protocol.pages);
  const cards = useWorkbenchStore(state => state.protocol.cards);
  const plateMaps = useWorkbenchStore(state => state.protocol.plateMaps);
  const panels = useWorkbenchStore(state => state.protocol.flowCytometryPanels);
  const showCard = useShowCard();
  const [removing, setRemoving] = useState<{ type: RemovableType; entry: RailShownEntry }>();
  const hasProcedure = cards.some(card => card.page === activePageId && card.type === 'procedure');

  const added = (cardId: string, railItem: HTMLButtonElement | undefined) =>
    showCard(cardId, { isNew: true, addedFrom: railItem });

  const showInCard = (
    railItem: HTMLButtonElement | undefined,
    recipe: (draft: Protocol) => ProtocolCard
  ) => {
    let cardId = '';
    updateProtocol(draft => {
      cardId = recipe(draft).id;
    });
    added(cardId, railItem);
  };

  const open = (draft: Protocol, target: CardTarget) => openCard(draft, target, activePageId);

  const showPlateMapIn = (draft: Protocol, plateMapId: string) => {
    const card = open(draft, { type: 'plateMap', shows: plateMapId });
    const hasStains = draft.flowCytometryPanels.some(panel => panel.stains.length);
    if (card.type === 'plateMap' && hasStains) card.side = 'stain';
    return card;
  };

  const newPlateMapIn = (draft: Protocol) => {
    const plateMap = newPlateMap();
    draft.plateMaps.push(plateMap);
    return open(draft, { type: 'plateMap', shows: plateMap.id });
  };

  const newPanelIn = (draft: Protocol) => {
    const panel = newFlowCytometryPanel();
    draft.flowCytometryPanels.push(panel);
    return open(draft, { type: 'flowCytometryPanel', shows: panel.id });
  };

  const addCard = (type: ProtocolCardType, railItem: HTMLButtonElement | undefined) => {
    if (type === 'plateMap') return showInCard(railItem, newPlateMapIn);
    if (type === 'flowCytometryPanel') return showInCard(railItem, newPanelIn);
    showInCard(railItem, draft => open(draft, { type }));
  };

  const removeForGood = () => {
    if (!removing) return;
    const { type, entry } = removing;
    setRemoving(undefined);
    updateProtocol(draft =>
      type === 'plateMap'
        ? removePlateMap(draft, entry.id)
        : removeFlowCytometryPanel(draft, entry.id)
    );
  };

  const plateMapMenu = (
    <WorkbenchCardRailShowMenu
      icon={CARD_ICONS.plateMap}
      label={CARD_TYPES.plateMap.label}
      hint={CARD_TYPES.plateMap.hint}
      menuLabel="Show a plate map"
      newLabel="Empty plate map"
      newHint="Start a new set of plates"
      sections={shownSections(plateMaps.map(plateMapEntry), pages, cards)}
      onNew={railItem => showInCard(railItem, newPlateMapIn)}
      onRemove={entry => setRemoving({ type: 'plateMap', entry })}
      onShow={(plateMapId, railItem) =>
        showInCard(railItem, draft => showPlateMapIn(draft, plateMapId))
      }
    />
  );

  const panelMenu = (
    <WorkbenchCardRailShowMenu
      icon={CARD_ICONS.flowCytometryPanel}
      label={CARD_TYPES.flowCytometryPanel.label}
      hint={CARD_TYPES.flowCytometryPanel.hint}
      menuLabel="Show a Flow panel"
      newLabel="Empty flow panel"
      newHint="Start a new panel of markers"
      sections={shownSections(panels.map(panelEntry), pages, cards)}
      onNew={railItem => showInCard(railItem, newPanelIn)}
      onRemove={entry => setRemoving({ type: 'flowCytometryPanel', entry })}
      onShow={(panelId, railItem) =>
        showInCard(railItem, draft => open(draft, { type: 'flowCytometryPanel', shows: panelId }))
      }
    />
  );

  const showMenus: Partial<Record<ProtocolCardType, ReactNode>> = {
    plateMap: plateMaps.length ? plateMapMenu : undefined,
    flowCytometryPanel: panels.length ? panelMenu : undefined,
  };

  const groups = RAIL_GROUPS.map(
    ([label, types]) => [label, types.filter(type => CARD_PANELS[type])] as const
  ).filter(([, types]) => types.length);

  return (
    <nav aria-label="Add a card" className="flex flex-col gap-4">
      {groups.map(([label, types]) => (
        <section key={label}>
          <h4 className={RAIL_HEADING}>{label}</h4>
          {types.map(type => {
            const showMenu = showMenus[type];
            if (showMenu) return <Fragment key={type}>{showMenu}</Fragment>;
            const isOnPage = type === 'procedure' && hasProcedure;
            return (
              <WorkbenchCardRailItem
                key={type}
                icon={CARD_ICONS[type]}
                label={CARD_TYPES[type].label}
                hint={
                  isOnPage
                    ? 'This page has its Procedure. Add a page for another.'
                    : CARD_TYPES[type].hint
                }
                isDisabled={isOnPage}
                onPick={railItem => addCard(type, railItem)}
              />
            );
          })}
        </section>
      ))}
      <ConfirmDialog
        isOpen={!!removing}
        variant="danger"
        title={removing ? removalTitle(removing.type) : ''}
        message={removing ? removalMessage(removing.type, removing.entry.label) : ''}
        confirmText="Remove"
        onConfirm={removeForGood}
        onCancel={() => setRemoving(undefined)}
      />
    </nav>
  );
}
