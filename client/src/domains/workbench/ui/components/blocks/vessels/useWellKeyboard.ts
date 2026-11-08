import { useRef, useState, type KeyboardEvent } from 'react';

import { wordsForTypes } from '../../../../utils/vessels/vesselCatalog';
import {
  copyWells,
  isWellFilled,
  pasteTargets,
  type CopiedWell,
} from '../../../../utils/vessels/wellSelection';

import { useUpdateVesselMap } from './useUpdateVesselMap';

import type { WellSelection } from './useWellSelection';
import type { VesselSheet, VesselTab } from '../../../../utils/vessels/vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

interface WellConfirmation {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}

interface FilledCheck {
  keys: readonly string[];
  title: string;
  confirmText: string;
  describe: (filled: string) => string;
  apply: () => void;
}

const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export function useWellKeyboard(
  block: VesselMapBlock,
  tab: VesselTab,
  sheet: VesselSheet,
  selection: WellSelection,
  onOpenEditor: (seedText?: string) => void
) {
  const updateVesselMap = useUpdateVesselMap(block);
  const clipboard = useRef<CopiedWell[]>([]);
  const [confirmation, setConfirmation] = useState<WellConfirmation>();
  const { noun, plural } = wordsForTypes(
    tab.kind === 'plate' ? [tab.plate.vessel] : block.sets.map(set => set.vessel)
  );
  const counted = (count: number) => `${count} ${count === 1 ? noun : plural}`;

  const confirmIfFilled = ({ keys, title, confirmText, describe, apply }: FilledCheck) => {
    const filled = keys.filter(key => isWellFilled(block, key)).length;
    if (!filled) return apply();
    setConfirmation({
      title,
      confirmText,
      message: describe(counted(filled)),
      onConfirm: () => {
        setConfirmation(undefined);
        apply();
      },
    });
  };

  const paste = () => {
    const targets = pasteTargets(sheet, clipboard.current, selection.keys);
    if (!targets.length) return;
    confirmIfFilled({
      keys: targets.map(target => target.key),
      title: 'Paste wells',
      confirmText: 'Replace',
      describe: filled => `Replace what’s in ${filled}?`,
      apply: () => {
        updateVesselMap(draft => {
          for (const { key, lines } of targets) draft.cells[key] = structuredClone(lines);
        });
        selection.selectKeys(targets.map(target => target.key));
      },
    });
  };

  const clearSelected = () =>
    confirmIfFilled({
      keys: [...selection.keys],
      title: 'Clear wells',
      confirmText: 'Clear',
      describe: filled => `Clear everything in ${filled}?`,
      apply: () =>
        updateVesselMap(draft => {
          for (const key of selection.keys) delete draft.cells[key];
        }),
    });

  const onKeyDown = (event: KeyboardEvent) => {
    const step = ARROW_STEPS[event.key];
    const isCommand = event.ctrlKey || event.metaKey;
    if (step && sheet.isPlate) {
      event.preventDefault();
      selection.move(step[0], step[1], event.shiftKey);
      onOpenEditor();
    } else if (event.key === 'Escape') {
      selection.clear();
    } else if (isCommand && event.key === 'c' && selection.keys.size) {
      event.preventDefault();
      clipboard.current = copyWells(block, sheet, selection.keys);
    } else if (isCommand && event.key === 'v' && selection.keys.size) {
      event.preventDefault();
      paste();
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && selection.keys.size) {
      event.preventDefault();
      clearSelected();
    } else if (event.key.length === 1 && !isCommand && !event.altKey && selection.keys.size) {
      event.preventDefault();
      onOpenEditor(event.key);
    }
  };

  return {
    onKeyDown,
    clearSelected,
    confirmation,
    dismissConfirmation: () => setConfirmation(undefined),
  };
}
