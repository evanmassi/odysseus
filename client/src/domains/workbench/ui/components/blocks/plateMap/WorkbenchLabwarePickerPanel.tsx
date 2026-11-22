import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { Minus, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Input } from '@shared/ui';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import {
  LABWARE_TYPES,
  labwareOf,
  type LabwareType,
} from '../../../../utils/plateMap/labwareCatalog';
import { labwareCountOf } from '../../../../utils/plateMap/plateMapEdits';

import type { PlateMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchLabwarePickerPanelProps {
  block: PlateMapBlock;
  anchorRef: RefObject<HTMLElement>;
  onCountChange: (type: LabwareType, count: number) => void;
  onClose: () => void;
}

const MARGIN = 8;
const STEP_BUTTON =
  'inline-flex h-7 w-7 items-center justify-center border border-line-soft text-foreground hover:border-primary/60 disabled:opacity-35';

export function WorkbenchLabwarePickerPanel({
  block,
  anchorRef,
  onCountChange,
  onClose,
}: WorkbenchLabwarePickerPanelProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [pickerPosition, setPickerPosition] = useState({ left: -9999, top: 0 });
  const typed = query.trim().toLowerCase();
  const groups = [...new Set(LABWARE_TYPES.map(type => labwareOf(type).group))].map(group => ({
    group,
    types: LABWARE_TYPES.filter(
      type =>
        labwareOf(type).group === group &&
        (!typed || labwareOf(type).label.toLowerCase().includes(typed))
    ),
  }));

  useLayoutEffect(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const picker = pickerRef.current;
    if (!anchor || !picker) return;
    setPickerPosition({
      left: Math.max(
        MARGIN,
        Math.min(anchor.left, window.innerWidth - picker.offsetWidth - MARGIN)
      ),
      top: Math.min(anchor.bottom + 6, window.innerHeight - picker.offsetHeight - MARGIN),
    });
  }, [anchorRef]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!pickerRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Add or remove labware"
      className="fixed z-50 flex w-[340px] flex-col gap-2 border border-line-mid bg-card p-2.5 shadow-lg"
      style={pickerPosition}
    >
      <Input
        ref={focusOnMount}
        size="sm"
        fullWidth
        value={query}
        placeholder="Find labware"
        aria-label="Find labware"
        spellCheck={false}
        onValueChange={setQuery}
      />
      <div className="flex max-h-80 flex-col overflow-auto">
        {groups.every(({ types }) => !types.length) && (
          <p className="px-1 py-2 text-caption text-muted-foreground">Nothing matches.</p>
        )}
        {groups.map(({ group, types }) =>
          types.length ? (
            <div key={group} className="flex flex-col">
              <span className="px-1 pb-1 pt-2 font-mono text-label-2xs uppercase tracking-label text-muted-foreground">
                {group}
              </span>
              {types.map(type => {
                const count = labwareCountOf(block, type);
                const { label } = labwareOf(type);
                return (
                  <div
                    key={type}
                    className={`flex items-center justify-between gap-2 px-1 py-1 text-body-sm ${
                      count ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`One fewer ${label}`}
                        className={STEP_BUTTON}
                        disabled={!count}
                        onClick={() => onCountChange(type, count - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        key={`${type}:${count}`}
                        defaultValue={count}
                        inputMode="numeric"
                        aria-label={`Count of ${label}`}
                        className="h-7 w-10 border border-line-soft bg-transparent text-center font-mono text-data-sm text-foreground outline-none focus:border-primary/60"
                        onBlur={event => onCountChange(type, Number(event.currentTarget.value))}
                        onKeyDown={event => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                        }}
                      />
                      <button
                        type="button"
                        aria-label={`One more ${label}`}
                        className={STEP_BUTTON}
                        onClick={() => onCountChange(type, count + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        Each plate gets its own tab; flasks, dishes and tubes share one.
      </p>
    </div>,
    document.body
  );
}
