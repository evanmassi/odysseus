import { useRef, useState, type KeyboardEvent } from 'react';

import { notifications } from '@shared/utils/notifications';

import { moveAssayWells } from '../../../../utils/vessels/assayMoves';
import {
  forgetStainOf,
  moveStainSpots,
  stainMoveTargets,
} from '../../../../utils/vessels/stainLayout';
import { tabWords } from '../../../../utils/vessels/vesselTabs';
import {
  copyWells,
  isWellFilled,
  pasteTargets,
  shiftedTargets,
  type CopiedWell,
} from '../../../../utils/vessels/wellSelection';

import { useUpdateVesselMap } from './useUpdateVesselMap';

import type { Confirmation } from './useConfirmation';
import type { WellSelection } from './useWellSelection';
import type { VesselSheet, VesselTab } from '../../../../utils/vessels/vesselTabs';
import type { VesselMapBlock } from '@odysseus/shared-schemas';

interface FilledCheck {
  keys: readonly string[];
  title: string;
  confirmText: string;
  describe: (filled: string) => string;
  apply: () => void;
}

type VesselSide = VesselMapBlock['side'];

interface ClipboardMarks {
  tabId: string;
  side: VesselSide;
  keys: ReadonlySet<string>;
  isCut: boolean;
}

const NO_KEYS: ReadonlySet<string> = new Set();

const blockedMove = (reason: 'edge' | 'cells', plural: string) =>
  reason === 'edge'
    ? `Those ${plural} would land past the edge of the plate.`
    : `Some of those ${plural} already hold samples on the Stain side. Move or pool them first.`;

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
  ask: (request: Confirmation) => void,
  onOpenEditor: (seedText?: string) => void,
  isStainSide: boolean
) {
  const updateVesselMap = useUpdateVesselMap(block);
  const clipboard = useRef<CopiedWell[]>([]);
  const [marks, setMarks] = useState<ClipboardMarks>();
  const side: VesselSide = isStainSide ? 'stain' : 'assay';
  const marksHere = marks?.tabId === tab.id ? marks : undefined;
  const cutKeys = marksHere?.isCut && marksHere.side === side ? marksHere.keys : NO_KEYS;
  const copiedKeys = marksHere && !marksHere.isCut ? marksHere.keys : NO_KEYS;
  const { noun, plural } = tabWords(block, tab);
  const counted = (count: number) => `${count} ${count === 1 ? noun : plural}`;

  const confirmIfFilled = ({ keys, title, confirmText, describe, apply }: FilledCheck) => {
    const filled = keys.filter(key => isWellFilled(block, key)).length;
    if (!filled) return apply();
    ask({ title, confirmText, message: describe(counted(filled)), onConfirm: apply });
  };

  const finishMove = (landing: string[]) => {
    setMarks(undefined);
    selection.selectKeys(landing);
  };

  const moveCutWells = () => {
    if (isStainSide) {
      const targets = stainMoveTargets(block, sheet, cutKeys, selection.keys);
      if ('blockedBy' in targets)
        return notifications.warning(blockedMove(targets.blockedBy, plural));
      updateVesselMap(draft => moveStainSpots(draft, sheet, cutKeys, targets.landing));
      return finishMove(targets.landing);
    }
    const landing = shiftedTargets(sheet, cutKeys, selection.keys);
    if (!landing) return notifications.warning(blockedMove('edge', plural));
    confirmIfFilled({
      keys: landing.filter(key => !cutKeys.has(key)),
      title: 'Move wells',
      confirmText: 'Replace',
      describe: filled => `Replace what's in ${filled}?`,
      apply: () => {
        updateVesselMap(draft => moveAssayWells(draft, sheet, cutKeys, landing));
        finishMove(landing);
      },
    });
  };

  const pasteCopied = () => {
    const targets = pasteTargets(sheet, clipboard.current, selection.keys);
    if (!targets.length) return;
    const pasted = targets.map(target => target.key);
    const finishPaste = () => {
      setMarks(undefined);
      selection.selectKeys(pasted);
    };
    if (isStainSide) {
      updateVesselMap(draft => {
        for (const { key, mixId } of targets) {
          if (mixId) draft.stain[key] = mixId;
          else delete draft.stain[key];
        }
      });
      return finishPaste();
    }
    confirmIfFilled({
      keys: pasted,
      title: 'Paste wells',
      confirmText: 'Replace',
      describe: filled => `Replace what's in ${filled}?`,
      apply: () => {
        updateVesselMap(draft => {
          for (const { key, lines } of targets) draft.cells[key] = structuredClone(lines);
        });
        finishPaste();
      },
    });
  };

  const paste = () => (cutKeys.size ? moveCutWells() : pasteCopied());

  const markSelected = (isCut: boolean) =>
    setMarks({ tabId: tab.id, side, keys: new Set(selection.keys), isCut });

  const copySelected = () => {
    clipboard.current = copyWells(block, sheet, selection.keys);
    markSelected(false);
  };

  const cutSelected = () => {
    clipboard.current = [];
    markSelected(true);
  };

  const clearWells = () =>
    updateVesselMap(draft => {
      if (!isStainSide) forgetStainOf(draft, selection.keys);
      for (const key of selection.keys) {
        if (isStainSide) delete draft.stain[key];
        else delete draft.cells[key];
      }
    });

  const clearSelected = () =>
    isStainSide
      ? clearWells()
      : confirmIfFilled({
          keys: [...selection.keys],
          title: 'Clear wells',
          confirmText: 'Clear',
          describe: filled => `Clear everything in ${filled}?`,
          apply: clearWells,
        });

  const onKeyDown = (event: KeyboardEvent) => {
    const step = ARROW_STEPS[event.key];
    const isCommand = event.ctrlKey || event.metaKey;
    if (step && sheet.isPlate) {
      event.preventDefault();
      selection.move(step[0], step[1], event.shiftKey);
    } else if (event.key === 'Enter' && selection.keys.size && !isStainSide) {
      event.preventDefault();
      onOpenEditor();
    } else if (event.key === 'Escape') {
      setMarks(undefined);
      selection.clear();
    } else if (isCommand && event.key === 'c' && selection.keys.size) {
      event.preventDefault();
      copySelected();
    } else if (isCommand && event.key === 'x' && selection.keys.size) {
      event.preventDefault();
      cutSelected();
    } else if (isCommand && event.key === 'v' && selection.keys.size) {
      event.preventDefault();
      paste();
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && selection.keys.size) {
      event.preventDefault();
      clearSelected();
    } else if (
      event.key.length === 1 &&
      !isCommand &&
      !event.altKey &&
      selection.keys.size &&
      !isStainSide
    ) {
      event.preventDefault();
      onOpenEditor(event.key);
    }
  };

  return {
    onKeyDown,
    clearSelected,
    copySelected,
    cutSelected,
    paste,
    canPaste: () => cutKeys.size > 0 || clipboard.current.length > 0,
    cutKeys,
    copiedKeys,
  };
}
