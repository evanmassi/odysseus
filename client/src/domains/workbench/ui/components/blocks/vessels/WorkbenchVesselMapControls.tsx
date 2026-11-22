import { useRef, useState } from 'react';

import { Combine, Copy, Pencil, Plus, X } from 'lucide-react';

import { Button, DropdownMenu, HeaderStrip, MenuItem, Tab, Tooltip } from '@shared/ui';

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
  editLabel: string | undefined;
  onEdit: () => void;
}

export type CopyPlace = 'tab' | 'card';

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
  editLabel,
  onEdit,
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
    <HeaderStrip className="-mx-3 flex items-center gap-2 px-3">
      <WorkbenchTabStrip value={activeId} ids={tabs.map(tab => tab.id)} onChange={onShowTab}>
        {tabs.map(tab =>
          tab.id === renamingId ? (
            <input
              key={tab.id}
              ref={focusOnMount}
              defaultValue={tab.ownName}
              placeholder={tab.name}
              aria-label="Tab name"
              spellCheck={false}
              className="w-40 bg-transparent px-3 py-2 type-name text-label-sm text-foreground outline-none"
              onFocus={event => event.currentTarget.select()}
              onBlur={event => finishRename(tab.id, event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setRenamingId(undefined);
              }}
            />
          ) : (
            <span
              key={tab.id}
              role="presentation"
              onDoubleClick={() => setRenamingId(tab.id)}
              onKeyDown={event => {
                if (event.key === 'F2') setRenamingId(tab.id);
              }}
            >
              <Tab id={tab.id}>
                <span className="inline-flex items-center gap-1">
                  <span>
                    {tab.name}
                    <span className="ml-1.5 text-label-2xs opacity-65">{tab.kind}</span>
                  </span>
                  {tab.isPlate && canRemovePlates && tab.id === activeId && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${tab.name}`}
                      className="inline-flex text-muted-foreground hover:text-danger-text"
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
                </span>
              </Tab>
            </span>
          )
        )}
      </WorkbenchTabStrip>
      <span className="flex flex-none items-center gap-0.5">
        {editLabel && (
          <Tooltip content={`Edit ${editLabel} (Enter)`}>
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              aria-label={`Edit ${editLabel}`}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        {active?.isPlate && (
          <Tooltip
            content={
              block.mergesReplicates ? 'Show replicates as one: on' : 'Show replicates as one: off'
            }
          >
            <Button
              variant={block.mergesReplicates ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              aria-label="Show replicates as one"
              aria-pressed={block.mergesReplicates}
              onClick={onToggleMerge}
            >
              <Combine className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        <Tooltip content="Add or remove labware">
          <span ref={pickerAnchorRef} className="inline-flex">
            <Button
              variant={isPicking ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              aria-label="Add labware"
              aria-expanded={isPicking}
              onClick={() => setIsPicking(!isPicking)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </span>
        </Tooltip>
        <Tooltip
          content={
            active?.isPlate
              ? 'Duplicate this plate'
              : 'Duplicate these into a new card beside this one'
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
              aria-label="Duplicate this plate"
              className="top-9 w-48 normal-case tracking-normal"
            >
              {(['tab', 'card'] as const).map(place => (
                <MenuItem
                  key={place}
                  label={place === 'tab' ? 'Duplicate as a new tab' : 'Duplicate to a new card'}
                  onClick={() => {
                    setIsCopying(false);
                    onDuplicate(place);
                  }}
                />
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
    </HeaderStrip>
  );
}
