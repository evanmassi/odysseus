import { useRef, useState } from 'react';

import { WorkbenchVesselPickerPanel } from './WorkbenchVesselPickerPanel';

import type { VesselType } from '../../../../utils/vessels/vesselCatalog';
import type { VesselTab } from '../../../../utils/vessels/vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchVesselMapControlsProps {
  block: VesselMapBlock;
  tab: VesselTab;
  namePlaceholder: string;
  onRename: (name: string) => void;
  onToggleMerge: () => void;
  onSetCount: (type: VesselType, count: number) => void;
  onDuplicate: () => void;
}

const TOOL_BUTTON =
  'h-8 flex-none whitespace-nowrap border border-line-soft px-3 text-body-sm text-foreground hover:border-primary/60';
const TOOL_BUTTON_ON = 'border-primary/60 bg-primary/10';
const NAME_INPUT =
  'h-9 min-w-[120px] flex-1 border border-transparent bg-transparent px-1.5 text-title-sm text-foreground outline-none placeholder:text-muted-foreground hover:border-border focus:border-primary/50';

export function WorkbenchVesselMapControls({
  block,
  tab,
  namePlaceholder,
  onRename,
  onToggleMerge,
  onSetCount,
  onDuplicate,
}: WorkbenchVesselMapControlsProps) {
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const [isPicking, setIsPicking] = useState(false);
  const ownName = tab.kind === 'plate' ? tab.plate.name : (block.shelfName ?? '');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        key={`${tab.id}:${ownName}`}
        defaultValue={ownName}
        placeholder={namePlaceholder}
        aria-label={tab.kind === 'plate' ? 'Plate name' : 'Vessel group name'}
        spellCheck={false}
        className={NAME_INPUT}
        onBlur={event => onRename(event.currentTarget.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {tab.kind === 'plate' && (
        <button
          type="button"
          aria-pressed={block.mergesReplicates}
          title="Draw matching neighbors, like replicates, as one well"
          className={`${TOOL_BUTTON} ${block.mergesReplicates ? TOOL_BUTTON_ON : ''}`}
          onClick={onToggleMerge}
        >
          Merge Replicates
        </button>
      )}
      <button
        ref={pickerButtonRef}
        type="button"
        aria-expanded={isPicking}
        title="Add or remove plates, flasks, dishes and tubes"
        className={`${TOOL_BUTTON} ${isPicking ? TOOL_BUTTON_ON : ''}`}
        onClick={() => setIsPicking(!isPicking)}
      >
        Add Vessel
      </button>
      <button
        type="button"
        title={`Copy ${tab.kind === 'plate' ? 'this plate' : 'these'} into a new card beside this one`}
        className={TOOL_BUTTON}
        onClick={onDuplicate}
      >
        Duplicate
      </button>
      {isPicking && (
        <WorkbenchVesselPickerPanel
          block={block}
          anchorRef={pickerButtonRef}
          onCountChange={onSetCount}
          onClose={() => setIsPicking(false)}
        />
      )}
    </div>
  );
}
