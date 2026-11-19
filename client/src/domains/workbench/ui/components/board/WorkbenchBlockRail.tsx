import { Fragment, useRef, useState } from 'react';

import { Plus } from 'lucide-react';

import { DropdownMenu, MenuItem, useMenuItemHover } from '@shared/ui';

import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { BLOCK_TYPES } from '../../../utils/blocks/blockTypes';
import { createBlock } from '../../../utils/blocks/createBlock';
import { plateNameOf, shelfNameOf, vesselTabs } from '../../../utils/vessels/vesselTabs';

import { BLOCK_ICONS } from './blockIcons';
import { BLOCK_PANELS } from './blockPanels';

import type {
  PlateViewBlock,
  Protocol,
  ProtocolBlockType,
  VesselMapBlock,
} from '@odysseus/shared-schemas';

const RAIL_GROUPS: ReadonlyArray<[string, ProtocolBlockType[]]> = [
  ['Inputs', ['materials', 'cytometer']],
  ['Write', ['text', 'steps', 'flow', 'sketch']],
  ['Numbers', ['values', 'formula', 'dilutions', 'list']],
  ['Layout', ['plate']],
];

const MENU_GAP = 8;
const MENU_HEADING =
  'relative z-10 block px-3 pb-1 pt-2 type-label text-label-2xs text-muted-foreground first:pt-1';

const tabNames = (block: VesselMapBlock) =>
  vesselTabs(block)
    .map(tab => (tab.kind === 'plate' ? plateNameOf(block, tab.plate) : shelfNameOf(block)))
    .join(', ');

const bottomOf = (draft: Protocol, page: string) =>
  Math.max(0, ...draft.blocks.filter(block => block.page === page).map(block => block.y + block.h));

export function WorkbenchBlockRail() {
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const pages = useWorkbenchStore(state => state.protocol.pages);
  const blocks = useWorkbenchStore(state => state.protocol.blocks);
  const plates = blocks.filter((block): block is VesselMapBlock => block.type === 'plate');
  const hasProcedure = blocks.some(block => block.page === activePageId && block.type === 'steps');
  const startFromRef = useRef<HTMLDivElement>(null);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [startMenuAt, setStartMenuAt] = useState<{ top: number; left: number }>();
  const closeStartMenu = () => setIsStartMenuOpen(false);

  const addBlock = (type: ProtocolBlockType) =>
    updateProtocol(draft => {
      const [w, h] = BLOCK_TYPES[type].size;
      draft.blocks.push(
        createBlock(type, { page: activePageId, x: 0, y: bottomOf(draft, activePageId), w, h })
      );
    });

  const showPlate = (source: VesselMapBlock) =>
    updateProtocol(draft => {
      const view = createBlock('plateView', {
        page: activePageId,
        x: 0,
        y: bottomOf(draft, activePageId),
        w: source.w,
        h: BLOCK_TYPES.plateView.size[1],
      }) as PlateViewBlock;
      view.shows = source.id;
      view.side = draft.blocks.some(block => block.type === 'cytometer' && block.mixes.length)
        ? 'stain'
        : 'assay';
      draft.blocks.push(view);
    });

  const pick = (type: ProtocolBlockType) => {
    if (type !== 'plate' || !plates.length) return addBlock(type);
    if (isStartMenuOpen) return closeStartMenu();
    const item = startFromRef.current?.getBoundingClientRect();
    if (item) setStartMenuAt({ top: item.top, left: item.right + MENU_GAP });
    setIsStartMenuOpen(true);
  };

  const menuHover = useMenuItemHover();

  const groups = RAIL_GROUPS.map(
    ([label, types]) => [label, types.filter(type => BLOCK_PANELS[type])] as const
  ).filter(([, types]) => types.length);

  return (
    <nav aria-label="Add a block" className="flex flex-col gap-4">
      {groups.map(([label, types]) => (
        <section key={label}>
          <h4 className="px-2 pb-1 type-label text-label-xs text-muted-foreground">{label}</h4>
          {types.map(type => {
            const Icon = BLOCK_ICONS[type];
            const isOnPage = type === 'steps' && hasProcedure;
            const hasStartChoice = type === 'plate' && plates.length > 0;
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
                      {BLOCK_TYPES[type].label}
                    </span>
                    <span className="block text-label-xs text-muted-foreground">
                      {isOnPage
                        ? 'This page has its Procedure. Add a page for another.'
                        : BLOCK_TYPES[type].hint}
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
                    aria-label="Start the Vessel map from"
                    className="min-w-[160px] max-w-sm"
                    style={startMenuAt}
                  >
                    <span className={MENU_HEADING}>Start from</span>
                    <MenuItem
                      icon={Plus}
                      label="Empty plate map"
                      onClick={() => {
                        closeStartMenu();
                        addBlock('plate');
                      }}
                    />
                    {pages.map(page => {
                      const onPage = plates.filter(source => source.page === page.id);
                      if (!onPage.length) return null;
                      return (
                        <Fragment key={page.id}>
                          <span className={MENU_HEADING}>{page.name}</span>
                          {onPage.map(source => (
                            <MenuItem
                              key={source.id}
                              icon={BLOCK_ICONS.plate}
                              label={source.title}
                              description={tabNames(source)}
                              onClick={() => {
                                closeStartMenu();
                                showPlate(source);
                              }}
                            />
                          ))}
                        </Fragment>
                      );
                    })}
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
