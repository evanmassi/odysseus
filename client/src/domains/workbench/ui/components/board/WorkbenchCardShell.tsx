import { memo, useRef, useState, type ComponentType } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

import { ConsolePanel, Tooltip, WELL_BASE } from '@shared/ui';

import { useFitCardHeight } from '../../../hooks/useFitCardHeight';
import { CARD_SURFACE_ATTRIBUTE } from '../../../hooks/useShowCard';
import { useUpdateCard } from '../../../hooks/useUpdateCard';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { CARD_TYPES, defaultCardTitle } from '../../../utils/cards/cardTypes';
import { focusOnMount } from '../../../utils/dom/focusOnMount';
import { labwareKinds, labwareTitle } from '../../../utils/plateMap/plateMapTabs';

import { capsKeepingGreek } from './capsKeepingGreek';
import { CARD_HEADER_BUTTON } from './cardHeaderStyles';
import { CARD_ICONS } from './cardIcons';
import { CARD_HEADER_CONTROLS, CARD_PANELS } from './cardPanels';
import { WorkbenchCardPendingPanel } from './WorkbenchCardPendingPanel';
import { WorkbenchCardUsageTip } from './WorkbenchCardUsageTip';

import type { ProtocolCard } from '@odysseus/shared-schemas';

export const CARD_DRAG_HANDLE = 'workbench-card-handle';

interface WorkbenchCardShellProps {
  card: ProtocolCard;
}

export const WorkbenchCardShell = memo(function WorkbenchCardShell({
  card,
}: WorkbenchCardShellProps) {
  const updateCard = useUpdateCard(card);
  const plateMap = useWorkbenchStore(state =>
    card.type === 'plateMap'
      ? state.protocol.plateMaps.find(candidate => candidate.id === card.shows)
      : undefined
  );
  const panelTitle = useWorkbenchStore(state =>
    card.type === 'flowCytometryPanel'
      ? state.protocol.flowCytometryPanels.find(candidate => candidate.id === card.shows)?.title
      : undefined
  );
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [isRenaming, setIsRenaming] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFitCardHeight(card, shellRef, contentRef);
  const cardType = CARD_TYPES[card.type];
  const Icon = CARD_ICONS[card.type];
  const Panel = CARD_PANELS[card.type] as ComponentType<{ card: ProtocolCard }> | undefined;
  const HeaderControls = CARD_HEADER_CONTROLS[card.type] as
    | ComponentType<{ card: ProtocolCard }>
    | undefined;
  const automaticTitle = plateMap ? labwareKinds(plateMap) : cardType.label;
  const shownTitle = plateMap
    ? labwareTitle(plateMap)
    : 'title' in card
      ? card.title
      : (panelTitle ?? automaticTitle);
  const hasOwnTitle = shownTitle.trim().toLowerCase() !== automaticTitle.toLowerCase();

  const toggleFold = () =>
    updateCard(draft => {
      if (draft.isCollapsed) {
        draft.isCollapsed = false;
        draft.h = draft.expandedHeight ?? cardType.size[1];
      } else {
        draft.isCollapsed = true;
        draft.expandedHeight = draft.h;
        draft.h = 1;
      }
    });

  const finishRename = (title: string) => {
    setIsRenaming(false);
    const typed = withGreekLetters(title.trim());
    const isAutomatic = !typed || typed.toLowerCase() === automaticTitle.toLowerCase();
    const savedTitle = isAutomatic ? defaultCardTitle(card.type) : typed;
    updateProtocol(draft => {
      if (card.type === 'plateMap') {
        const target = draft.plateMaps.find(candidate => candidate.id === card.shows);
        if (target) target.title = isAutomatic ? '' : typed;
        return;
      }
      if (card.type === 'flowCytometryPanel') {
        const target = draft.flowCytometryPanels.find(candidate => candidate.id === card.shows);
        if (target) target.title = savedTitle;
        return;
      }
      const target = draft.cards.find(candidate => candidate.id === card.id);
      if (target && 'title' in target) target.title = savedTitle;
    });
  };

  const closeCard = () =>
    updateProtocol(draft => {
      draft.cards = draft.cards.filter(candidate => candidate.id !== card.id);
    });

  return (
    <div ref={shellRef} className="h-full">
      <ConsolePanel
        {...{ [CARD_SURFACE_ATTRIBUTE]: '' }}
        intensity="soft"
        className="flex h-full min-h-0 flex-col overflow-hidden"
      >
        <div
          className={`${CARD_DRAG_HANDLE} flex flex-none cursor-grab items-center gap-2 px-2 py-2`}
        >
          <button
            type="button"
            className={CARD_HEADER_BUTTON}
            onClick={toggleFold}
            aria-label={card.isCollapsed ? 'Expand card' : 'Collapse card'}
          >
            {card.isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <Icon aria-hidden className="h-4 w-4 flex-none text-primary" />
          {isRenaming ? (
            <input
              ref={focusOnMount}
              defaultValue={shownTitle}
              aria-label="Card title"
              className="min-w-0 flex-1 bg-transparent type-name text-label-md font-semibold text-foreground outline-none"
              onBlur={event => finishRename(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setIsRenaming(false);
              }}
            />
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Tooltip content="Double-click to rename">
                <span
                  className="min-w-0 truncate type-name text-label-md font-semibold uppercase text-foreground"
                  onDoubleClick={() => setIsRenaming(true)}
                >
                  {capsKeepingGreek(shownTitle)}
                  {hasOwnTitle && (
                    <span className="ml-2 font-normal text-muted-foreground">{automaticTitle}</span>
                  )}
                </span>
              </Tooltip>
              {cardType.usageTip && (
                <WorkbenchCardUsageTip tip={cardType.usageTip} cardLabel={cardType.label} />
              )}
            </span>
          )}
          {HeaderControls && !card.isCollapsed && <HeaderControls card={card} />}
          <button
            type="button"
            className={CARD_HEADER_BUTTON}
            onClick={closeCard}
            aria-label="Close card"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!card.isCollapsed && (
          <div
            ref={contentRef}
            className={`mx-1.5 mb-1.5 min-h-0 flex-1 overflow-auto ${WELL_BASE}`}
          >
            {Panel ? <Panel card={card} /> : <WorkbenchCardPendingPanel card={card} />}
          </div>
        )}
      </ConsolePanel>
    </div>
  );
});
