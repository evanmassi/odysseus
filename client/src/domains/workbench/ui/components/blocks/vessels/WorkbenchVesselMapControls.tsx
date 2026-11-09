import { useRef, useState } from 'react';

import { Combine, Copy, Plus, X } from 'lucide-react';

import { Button, DropdownMenu, Tab, Tooltip } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { WorkbenchTabStrip } from '../../board/WorkbenchTabStrip';

import { WorkbenchVesselPickerPanel } from './WorkbenchVesselPickerPanel';

import type { VesselType } from '../../../../utils/vessels/vesselCatalog';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

export interface VesselTabLabel {
  id: string;
  name: string;
  kind: string;
  ownName: string;
  isPlate: boolean;
}

interface WorkbenchVesselMapControlsProps {
  block: VesselMapBlock;
  tabs: readonly VesselTabLabel[];
  activeId: string;
  onShowTab: (id: string) => void;
  onRenameTab: (id: string, name: string) => void;
  onRemovePlate: (id: string) => void;
  onToggleMerge: () => void;
  onSetCount: (type: VesselType, count: number) => void;
  onDuplicate: (place: CopyPlace) => void;
}

export type CopyPlace = 'tab' | 'card';

const MENU_ROW =
  'flex w-full px-3 py-1.5 text-left text-body-sm text-foreground/80 transition-colors hover:bg-[linear-gradient(90deg,hsl(var(--primary)/0.18),transparent)] hover:text-foreground';

export function WorkbenchVesselMapControls({
  block,
  tabs,
  activeId,
  onShowTab,
  onRenameTab,
  onRemovePlate,
  onToggleMerge,
  onSetCount,
  onDuplicate,
}: WorkbenchVesselMapControlsProps) {
  const pickerAnchorRef = useRef<HTMLSpanElement>(null);
  const copyAnchorRef = useRef<HTMLSpanElement>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [renamingId, setRenamingId] = useState<string>();
  const active = tabs.find(tab => tab.id === activeId);
  const canRemovePlates = tabs.length > 1;

  const finishRename = (id: string, name: string) => {
    setRenamingId(undefined);
    onRenameTab(id, name);
  };

  return (
    <div className="flex items-center gap-2 border-b border-line-soft">
      <WorkbenchTabStrip value={activeId} ids={tabs.map(tab => tab.id)} onChange={onShowTab}>
        {tabs.map(tab =>
          tab.id === renamingId ? (
            <input
              key={tab.id}
              ref={focusOnMount}
              defaultValue={tab.ownName}
              placeholder={tab.name}
              aria-label={tab.isPlate ? 'Plate name' : 'Vessel group name'}
              spellCheck={false}
              className="w-40 bg-transparent px-3 py-2 type-label text-label-sm text-foreground outline-none"
              onFocus={event => event.currentTarget.select()}
              onBlur={event => finishRename(tab.id, event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setRenamingId(undefined);
              }}
            />
          ) : (
            <Tooltip content="Double-click or F2 to rename" key={tab.id}>
              <span
                role="presentation"
                onDoubleClick={() => setRenamingId(tab.id)}
                onKeyDown={event => {
                  if (event.key === 'F2') setRenamingId(tab.id);
                }}
              >
                <Tab id={tab.id}>
                  {tab.name}
                  <span className="ml-1.5 text-label-2xs opacity-65">{tab.kind}</span>
                  {tab.isPlate && canRemovePlates && tab.id === activeId && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${tab.name}`}
                      className="ml-1 inline-flex text-muted-foreground hover:text-danger-text"
                      onClick={event => {
                        event.stopPropagation();
                        onRemovePlate(tab.id);
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Enter') onRemovePlate(tab.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Tab>
              </span>
            </Tooltip>
          )
        )}
      </WorkbenchTabStrip>
      <span className="flex flex-none items-center gap-0.5">
        {active?.isPlate && (
          <Tooltip
            content={block.mergesReplicates ? 'Merge replicates: on' : 'Merge replicates: off'}
          >
            <Button
              variant={block.mergesReplicates ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              aria-label="Merge replicates"
              aria-pressed={block.mergesReplicates}
              onClick={onToggleMerge}
            >
              <Combine className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        <Tooltip content="Add or remove plates, flasks, dishes and tubes">
          <span ref={pickerAnchorRef} className="inline-flex">
            <Button
              variant={isPicking ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              aria-label="Add vessel"
              aria-expanded={isPicking}
              onClick={() => setIsPicking(!isPicking)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </span>
        </Tooltip>
        <Tooltip
          content={
            active?.isPlate ? 'Copy this plate' : 'Copy these into a new card beside this one'
          }
        >
          <span ref={copyAnchorRef} className="relative inline-flex">
            <Button
              variant={isCopying ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              aria-label="Duplicate"
              aria-expanded={active?.isPlate ? isCopying : undefined}
              onClick={() => (active?.isPlate ? setIsCopying(!isCopying) : onDuplicate('card'))}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <DropdownMenu
              isOpen={isCopying}
              onClose={() => setIsCopying(false)}
              triggerRef={copyAnchorRef}
              align="end"
              aria-label="Copy this plate"
              className="top-9 w-48 normal-case tracking-normal"
            >
              {(['tab', 'card'] as const).map(place => (
                <button
                  key={place}
                  type="button"
                  role="menuitem"
                  className={MENU_ROW}
                  onClick={() => {
                    setIsCopying(false);
                    onDuplicate(place);
                  }}
                >
                  {place === 'tab' ? 'Copy as a new tab' : 'Copy to a new card'}
                </button>
              ))}
            </DropdownMenu>
          </span>
        </Tooltip>
      </span>
      {isPicking && (
        <WorkbenchVesselPickerPanel
          block={block}
          anchorRef={pickerAnchorRef}
          onCountChange={onSetCount}
          onClose={() => setIsPicking(false)}
        />
      )}
    </div>
  );
}
