import { useRef, useState } from 'react';

import { Combine, Copy, Plus, X } from 'lucide-react';

import { Button, Tab, Tabs, Tooltip } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';

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
  onDuplicate: () => void;
}

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
  const [isPicking, setIsPicking] = useState(false);
  const [renamingId, setRenamingId] = useState<string>();
  const active = tabs.find(tab => tab.id === activeId);
  const canRemovePlates = tabs.length > 1;

  const finishRename = (id: string, name: string) => {
    setRenamingId(undefined);
    onRenameTab(id, name);
  };

  return (
    <div className="flex items-center gap-2 border-b border-line-soft">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <Tabs value={activeId} onChange={onShowTab} size="sm" orientation="horizontal">
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
        </Tabs>
      </div>
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
          content={`Copy ${active?.isPlate ? 'this plate' : 'these'} into a new card beside this one`}
        >
          <Button variant="ghost" size="sm" iconOnly aria-label="Duplicate" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
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
