import { useMemo, useRef, useState } from 'react';

import { produce } from 'immer';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import {
  guessMaterial,
  type MaterialGuess,
  type RememberedMaterialKind,
} from '../../../../utils/materials/materialGuesser';
import {
  applyMaterialKind,
  findDuplicateMaterial,
  materialFromGuess,
} from '../../../../utils/materials/materialItems';
import {
  commitReviewRows,
  hasMultipleLines,
  pastedReviewRows,
  reviewRow,
  type MaterialReviewRow,
} from '../../../../utils/materials/materialReview';

import type { MaterialKind } from './materialSelectOptions';
import type { MaterialItem, MaterialsBlock } from '@odysseus/shared-schemas';

export interface PasteReview {
  source: string;
  rows: MaterialReviewRow[];
}

export interface MaterialPreview {
  guess: MaterialGuess;
  item: MaterialItem;
  duplicate: MaterialItem | undefined;
}

const PASTE_SOURCE = 'the paste';
const SET_BY_YOU = 'set by you';

export function useMaterialAdding(
  block: MaterialsBlock,
  remembered: ReadonlyMap<string, RememberedMaterialKind>,
  onAdded: (freshIds: readonly string[]) => void
) {
  const keptBoth = useWorkbenchStore(state => state.protocol.keptBoth);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const updateBlock = useUpdateBlock(block);
  const rememberedMaterials = useMaterialMemoryStore(state => state.memory.materials);
  const rememberKind = useMaterialMemoryStore(state => state.rememberKind);
  const [text, setText] = useState('');
  const [chosenKind, setChosenKind] = useState<MaterialKind>();
  const [pendingDuplicate, setPendingDuplicate] = useState<MaterialReviewRow>();
  const [paste, setPaste] = useState<PasteReview>();
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo((): MaterialPreview | undefined => {
    if (!text.trim()) return undefined;
    const guessed = guessMaterial(text, remembered);
    const guess = chosenKind ? { ...guessed, ...chosenKind, why: SET_BY_YOU } : guessed;
    const item = materialFromGuess(guess, rememberedMaterials);
    return { guess, item, duplicate: findDuplicateMaterial(block.items, item, keptBoth) };
  }, [text, chosenKind, remembered, rememberedMaterials, block.items, keptBoth]);

  const finishAdding = (freshIds: readonly string[]) => {
    setText('');
    setPendingDuplicate(undefined);
    setChosenKind(undefined);
    onAdded(freshIds);
    inputRef.current?.focus();
  };

  const commit = (rows: readonly MaterialReviewRow[]) => {
    let freshIds: string[] = [];
    updateProtocol(draft => {
      freshIds = commitReviewRows(draft, block.id, rows);
    });
    finishAdding(freshIds);
  };

  const changeText = (value: string) => {
    setText(value);
    setPendingDuplicate(undefined);
    if (!value.trim()) setChosenKind(undefined);
  };

  const chooseKind = (kind: MaterialKind) => {
    setChosenKind(kind);
    inputRef.current?.focus();
  };

  const clear = () => changeText('');

  const submit = () => {
    if (!preview) return;
    const row = reviewRow(block.items, keptBoth, preview.item, '');
    if (chosenKind) rememberKind(row.item.name, row.item.group, row.item.type);
    if (preview.duplicate?.isDropped) {
      const { id } = preview.duplicate;
      updateBlock(draft => {
        const dropped = draft.items.find(item => item.id === id);
        if (dropped) dropped.isDropped = false;
      });
      finishAdding([id]);
      return;
    }
    if (row.duplicateId) setPendingDuplicate(row);
    else commit([row]);
  };

  const resolveDuplicate = (isKeptBoth: boolean) => {
    if (pendingDuplicate) commit([{ ...pendingDuplicate, isKeptBoth }]);
  };

  const pasteText = (pasted: string): boolean => {
    if (!hasMultipleLines(pasted)) return false;
    const rows = pastedReviewRows(pasted, block.items, keptBoth, remembered, rememberedMaterials);
    if (rows.length) setPaste({ source: PASTE_SOURCE, rows });
    return true;
  };

  const updatePasteRows = (recipe: (rows: MaterialReviewRow[]) => MaterialReviewRow[]) =>
    setPaste(current => {
      if (!current) return current;
      const rows = recipe(current.rows);
      return rows.length ? { ...current, rows } : undefined;
    });

  const setPasteRowKind = (index: number, { group, type }: MaterialKind) =>
    updatePasteRows(rows =>
      rows.map((row, at) =>
        at === index
          ? {
              ...row,
              item: produce(row.item, draft => applyMaterialKind(draft, group, type)),
              why: SET_BY_YOU,
              isCorrected: true,
            }
          : row
      )
    );

  const togglePasteKeep = (index: number) =>
    updatePasteRows(rows =>
      rows.map((row, at) => (at === index ? { ...row, isKeptBoth: !row.isKeptBoth } : row))
    );

  const dropPasteRow = (index: number) =>
    updatePasteRows(rows => rows.filter((_, at) => at !== index));

  const addPasted = () => {
    if (!paste) return;
    for (const { item, isCorrected } of paste.rows) {
      if (isCorrected) rememberKind(item.name, item.group, item.type);
    }
    setPaste(undefined);
    commit(paste.rows);
  };

  return {
    text,
    preview,
    pendingDuplicate,
    paste,
    inputRef,
    changeText,
    chooseKind,
    clear,
    submit,
    resolveDuplicate,
    pasteText,
    setPasteRowKind,
    togglePasteKeep,
    dropPasteRow,
    addPasted,
    cancelPaste: () => setPaste(undefined),
  };
}

export type MaterialAdding = ReturnType<typeof useMaterialAdding>;
