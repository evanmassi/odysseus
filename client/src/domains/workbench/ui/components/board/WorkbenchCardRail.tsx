import { Fragment, useRef, useState } from 'react';

import { Plus } from 'lucide-react';

import { DropdownMenu, MenuItem, useMenuItemHover } from '@shared/ui';

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

import type { PlateMap, Protocol, ProtocolCardType } from '@odysseus/shared-schemas';

const RAIL_GROUPS: ReadonlyArray<[string, ProtocolCardType[]]> = [
  ['Inputs', ['materials', 'flowCytometryPanel']],
  ['Write', ['procedure', 'flowDiagram']],
  ['Numbers', ['values', 'calculations', 'dilutions']],
  ['Layout', ['plateMap']],
];

const MENU_GAP = 8;
const NOT_SHOWN = 'Not shown';
const MENU_HEADING =
  'relative z-10 block px-3 pb-1 pt-2 type-label text-label-2xs text-muted-foreground first:pt-1';

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
  const plateMapsOn = (pageId: string) =>
    plateMaps.filter(plateMap =>
      cardsShowing(cards, plateMap.id).some(card => card.page === pageId)
    );
  const notShown = plateMaps.filter(plateMap => !cardsShowing(cards, plateMap.id).length);
  const hasProcedure = cards.some(card => card.page === activePageId && card.type === 'procedure');
  const startFromRef = useRef<HTMLDivElement>(null);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [startMenuAt, setStartMenuAt] = useState<{ top: number; left: number }>();
  const closeStartMenu = () => setIsStartMenuOpen(false);

  const placePlateCard = (draft: Protocol, plateMapId: string, side: 'assay' | 'stain') => {
    const [w, h] = CARD_TYPES.plateMap.size;
    const page = activePageId;
    const shownWidth = cardsShowing(draft.cards, plateMapId)[0]?.w;
    showPlateMap(
      draft,
      plateMapId,
      { page, x: 0, y: bottomOf(draft, page), w: shownWidth ?? w, h },
      side
    );
  };

  const showExisting = (plateMap: PlateMap) =>
    updateProtocol(draft =>
      placePlateCard(
        draft,
        plateMap.id,
        draft.cards.some(card => card.type === 'flowCytometryPanel' && card.stains.length)
          ? 'stain'
          : 'assay'
      )
    );

  const addCard = (type: ProtocolCardType) => {
    if (type === 'plateMap') {
      updateProtocol(draft => {
        const plateMap = newPlateMap();
        draft.plateMaps.push(plateMap);
        placePlateCard(draft, plateMap.id, 'assay');
      });
      return;
    }
    updateProtocol(draft => {
      const [w, h] = CARD_TYPES[type].size;
      draft.cards.push(
        createCard(type, { page: activePageId, x: 0, y: bottomOf(draft, activePageId), w, h })
      );
    });
  };

  const pick = (type: ProtocolCardType) => {
    if (type !== 'plateMap' || !plateMaps.length) return addCard(type);
    if (isStartMenuOpen) return closeStartMenu();
    const item = startFromRef.current?.getBoundingClientRect();
    if (item) setStartMenuAt({ top: item.top, left: item.right + MENU_GAP });
    setIsStartMenuOpen(true);
  };

  const plateMapItem = (plateMap: PlateMap) => (
    <MenuItem
      key={plateMap.id}
      icon={CARD_ICONS.plateMap}
      label={labwareTitle(plateMap)}
      description={tabNames(plateMap)}
      onClick={() => {
        closeStartMenu();
        showExisting(plateMap);
      }}
    />
  );

  const menuHover = useMenuItemHover();

  const groups = RAIL_GROUPS.map(
    ([label, types]) => [label, types.filter(type => CARD_PANELS[type])] as const
  ).filter(([, types]) => types.length);

  return (
    <nav aria-label="Add a card" className="flex flex-col gap-4">
      {groups.map(([label, types]) => (
        <section key={label}>
          <h4 className="px-2 pb-1 type-label text-label-xs text-muted-foreground">{label}</h4>
          {types.map(type => {
            const Icon = CARD_ICONS[type];
            const isOnPage = type === 'procedure' && hasProcedure;
            const hasStartChoice = type === 'plateMap' && plateMaps.length > 0;
            return (
              <div key={type} ref={hasStartChoice ? startFromRef : undefined} className="relative">
                <button
                  type="button"
                  disabled={isOnPage}
                  aria-expanded={hasStartChoice ? isStartMenuOpen : undefined}
                  onClick={() => pick(type)}
                  className={`flex w-full items-start gap-2.5 px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-50 ${isOnPage ? '' : menuHover}`}
                >
                  <Icon aria-hidden className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span className="min-w-0">
                    <span className="block text-body-sm text-foreground">
                      {CARD_TYPES[type].label}
                    </span>
                    <span className="block text-label-xs text-muted-foreground">
                      {isOnPage
                        ? 'This page has its Procedure. Add a page for another.'
                        : CARD_TYPES[type].hint}
                    </span>
                  </span>
                </button>
                {hasStartChoice && (
                  <DropdownMenu
                    isOpen={isStartMenuOpen}
                    onClose={closeStartMenu}
                    triggerRef={startFromRef}
                    portal
                    motion="slide-right"
                    aria-label="Start the Plate map from"
                    className="min-w-[160px] max-w-sm"
                    style={startMenuAt}
                  >
                    <span className={MENU_HEADING}>Start from</span>
                    <MenuItem
                      icon={Plus}
                      label="Empty plate map"
                      onClick={() => {
                        closeStartMenu();
                        addCard('plateMap');
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
