import { Fragment, useRef, useState } from 'react';

import { Plus } from 'lucide-react';

import { DropdownMenu } from '@shared/ui';

import { useShowCard } from '../../../hooks/useShowCard';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { CARD_TYPES } from '../../../utils/cards/cardTypes';
import { cardsShowing, createCard, showPlateMap } from '../../../utils/cards/createCard';
import { newPlateMap } from '../../../utils/plateMap/plateMapEdits';
import {
  plateNameOf,
  otherLabwareTabNameOf,
  plateMapTabs,
  labwareTitle,
} from '../../../utils/plateMap/plateMapTabs';

import { CARD_ICONS } from './cardIcons';
import { CARD_PANELS } from './cardPanels';
import { WorkbenchCardRailItem } from './WorkbenchCardRailItem';

import type { PlateMap, Protocol, ProtocolCardType } from '@odysseus/shared-schemas';

const RAIL_GROUPS: ReadonlyArray<[string, ProtocolCardType[]]> = [
  ['Inputs', ['materials', 'flowCytometryPanel']],
  ['Write', ['procedure', 'flowDiagram']],
  ['Numbers', ['values', 'calculations', 'dilutions']],
  ['Layout', ['plateMap']],
];

const MENU_GAP = 8;
const NOT_SHOWN = 'Not shown';
const RAIL_HEADING = 'px-2 pb-1 type-label text-label-xs text-muted-foreground';
const MENU_HEADING = `${RAIL_HEADING} block pt-3`;

const tabNames = (plateMap: PlateMap) =>
  plateMapTabs(plateMap)
    .map(tab =>
      tab.kind === 'plate' ? plateNameOf(plateMap, tab.plate) : otherLabwareTabNameOf(plateMap)
    )
    .join(', ');

const bottomOf = (draft: Protocol, page: string) =>
  Math.max(0, ...draft.cards.filter(card => card.page === page).map(card => card.y + card.h));

export function WorkbenchCardRail() {
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const pages = useWorkbenchStore(state => state.protocol.pages);
  const cards = useWorkbenchStore(state => state.protocol.cards);
  const plateMaps = useWorkbenchStore(state => state.protocol.plateMaps);
  const showCard = useShowCard();
  const plateMapsOn = (pageId: string) =>
    plateMaps.filter(plateMap =>
      cardsShowing(cards, plateMap.id).some(card => card.page === pageId)
    );
  const notShown = plateMaps.filter(plateMap => !cardsShowing(cards, plateMap.id).length);
  const hasProcedure = cards.some(card => card.page === activePageId && card.type === 'procedure');
  const startFromRef = useRef<HTMLDivElement>(null);
  const plateItemRef = useRef<HTMLButtonElement>();
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [startMenuAt, setStartMenuAt] = useState<{ top: number; left: number }>();
  const closeStartMenu = () => setIsStartMenuOpen(false);

  const added = (cardId: string, railItem: HTMLButtonElement | undefined) =>
    showCard(cardId, { isNew: true, addedFrom: railItem });

  const placePlateCard = (draft: Protocol, plateMapId: string, side: 'assay' | 'stain') => {
    const [w, h] = CARD_TYPES.plateMap.size;
    const page = activePageId;
    const shownWidth = cardsShowing(draft.cards, plateMapId)[0]?.w;
    return showPlateMap(
      draft,
      plateMapId,
      { page, x: 0, y: bottomOf(draft, page), w: shownWidth ?? w, h },
      side
    ).id;
  };

  const showExisting = (plateMap: PlateMap) => {
    let cardId = '';
    updateProtocol(draft => {
      const hasStains = draft.cards.some(
        card => card.type === 'flowCytometryPanel' && card.stains.length
      );
      cardId = placePlateCard(draft, plateMap.id, hasStains ? 'stain' : 'assay');
    });
    added(cardId, plateItemRef.current);
  };

  const addCard = (type: ProtocolCardType, railItem: HTMLButtonElement | undefined) => {
    let cardId = '';
    updateProtocol(draft => {
      if (type === 'plateMap') {
        const plateMap = newPlateMap();
        draft.plateMaps.push(plateMap);
        cardId = placePlateCard(draft, plateMap.id, 'assay');
        return;
      }
      const [w, h] = CARD_TYPES[type].size;
      const card = createCard(type, {
        page: activePageId,
        x: 0,
        y: bottomOf(draft, activePageId),
        w,
        h,
      });
      draft.cards.push(card);
      cardId = card.id;
    });
    added(cardId, railItem);
  };

  const pick = (type: ProtocolCardType, railItem: HTMLButtonElement) => {
    if (type !== 'plateMap' || !plateMaps.length) return addCard(type, railItem);
    if (isStartMenuOpen) return closeStartMenu();
    plateItemRef.current = railItem;
    const item = startFromRef.current?.getBoundingClientRect();
    if (item) setStartMenuAt({ top: item.top, left: item.right + MENU_GAP });
    setIsStartMenuOpen(true);
  };

  const plateMapItem = (plateMap: PlateMap) => (
    <WorkbenchCardRailItem
      key={plateMap.id}
      icon={CARD_ICONS.plateMap}
      label={labwareTitle(plateMap)}
      hint={tabNames(plateMap)}
      isMenuItem
      onPick={() => {
        closeStartMenu();
        showExisting(plateMap);
      }}
    />
  );

  const groups = RAIL_GROUPS.map(
    ([label, types]) => [label, types.filter(type => CARD_PANELS[type])] as const
  ).filter(([, types]) => types.length);

  return (
    <nav aria-label="Add a card" className="flex flex-col gap-4">
      {groups.map(([label, types]) => (
        <section key={label}>
          <h4 className={RAIL_HEADING}>{label}</h4>
          {types.map(type => {
            const isOnPage = type === 'procedure' && hasProcedure;
            const hasStartChoice = type === 'plateMap' && plateMaps.length > 0;
            return (
              <div key={type} ref={hasStartChoice ? startFromRef : undefined} className="relative">
                <WorkbenchCardRailItem
                  icon={CARD_ICONS[type]}
                  label={CARD_TYPES[type].label}
                  hint={
                    isOnPage
                      ? 'This page has its Procedure. Add a page for another.'
                      : CARD_TYPES[type].hint
                  }
                  isDisabled={isOnPage}
                  isExpanded={hasStartChoice ? isStartMenuOpen : undefined}
                  onPick={railItem => pick(type, railItem)}
                />
                {hasStartChoice && (
                  <DropdownMenu
                    isOpen={isStartMenuOpen}
                    onClose={closeStartMenu}
                    triggerRef={startFromRef}
                    portal
                    motion="slide-right"
                    aria-label="Show a plate map"
                    className="min-w-[200px] max-w-sm py-1"
                    style={startMenuAt}
                  >
                    <WorkbenchCardRailItem
                      icon={Plus}
                      label="Empty plate map"
                      hint="Start a new set of plates"
                      isMenuItem
                      onPick={() => {
                        closeStartMenu();
                        addCard('plateMap', plateItemRef.current);
                      }}
                    />
                    {pages.map(page => {
                      const onPage = plateMapsOn(page.id);
                      if (!onPage.length) return null;
                      return (
                        <Fragment key={page.id}>
                          <span className={MENU_HEADING}>{page.name}</span>
                          {onPage.map(plateMapItem)}
                        </Fragment>
                      );
                    })}
                    {notShown.length > 0 && (
                      <>
                        <span className={MENU_HEADING}>{NOT_SHOWN}</span>
                        {notShown.map(plateMapItem)}
                      </>
                    )}
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
