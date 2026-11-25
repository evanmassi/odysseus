import { useMemo, useRef, useState } from 'react';

import { produce } from 'immer';

import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { keepFluorsUsedBy } from '../../../../utils/fluors/fileFluors';
import {
  guessMaterial,
  type MaterialGuess,
  type MaterialKnowledge,
} from '../../../../utils/materials/materialGuesser';
import {
  applyMaterialType,
  findAlreadyListed,
  materialFromGuess,
} from '../../../../utils/materials/materialItems';
import {
  commitReviewRows,
  hasMultipleLines,
  pastedReviewRows,
  reviewRow,
  type MaterialReviewRow,
} from '../../../../utils/materials/materialReview';

import type { MaterialTypeSelection } from './materialSelectOptions';
import type { MaterialItem } from '@odysseus/shared-schemas';

export interface PasteReview {
  source: string;
  rows: MaterialReviewRow[];
}

export interface MaterialPreview {
  guess: MaterialGuess;
  item: MaterialItem;
  alreadyListed: MaterialItem | undefined;
}

const PASTE_SOURCE = 'the paste';
const SET_BY_YOU = 'set by you';

export function useMaterialAdding(
  known: MaterialKnowledge,
  onAdded: (freshIds: readonly string[]) => void
) {
  const keptBoth = useWorkbenchStore(state => state.protocol.keptBoth);
  const items = useWorkbenchStore(state => state.protocol.materials.items);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const rememberKind = useMaterialMemoryStore(state => state.rememberKind);
  const [text, setText] = useState('');
  const [chosenKind, setChosenKind] = useState<MaterialTypeSelection>();
  const [pendingAlreadyListed, setPendingAlreadyListed] = useState<MaterialReviewRow>();
  const [paste, setPaste] = useState<PasteReview>();
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo((): MaterialPreview | undefined => {
    if (!text.trim()) return undefined;
    const guessed = guessMaterial(text, known);
    const guess = chosenKind ? { ...guessed, ...chosenKind, why: SET_BY_YOU } : guessed;
    const item = materialFromGuess(guess, memory);
    return { guess, item, alreadyListed: findAlreadyListed(items, item, keptBoth) };
  }, [text, chosenKind, known, memory, items, keptBoth]);

  const finishAdding = (freshIds: readonly string[]) => {
    setText('');
    setPendingAlreadyListed(undefined);
    setChosenKind(undefined);
    onAdded(freshIds);
    inputRef.current?.focus();
  };

  const commit = (rows: readonly MaterialReviewRow[]) => {
    let freshIds: string[] = [];
    updateProtocol(draft => {
      freshIds = commitReviewRows(draft, rows);
      keepFluorsUsedBy(
        draft,
        rows.map(row => row.item),
        known.fluors
      );
    });
    finishAdding(freshIds);
  };

  const changeText = (value: string) => {
    setText(value);
    setPendingAlreadyListed(undefined);
    if (!value.trim()) setChosenKind(undefined);
  };

  const chooseKind = (kind: MaterialTypeSelection) => {
    setChosenKind(kind);
    inputRef.current?.focus();
  };

  const clear = () => changeText('');

  const submit = () => {
    if (!preview) return;
    const row = reviewRow(items, keptBoth, preview.item, '');
    if (chosenKind) rememberKind(row.item.name, row.item.group, row.item.type);
    if (preview.alreadyListed?.isSetAside) {
      const { id } = preview.alreadyListed;
      updateProtocol(draft => {
        const setAsideItem = draft.materials.items.find(item => item.id === id);
        if (setAsideItem) setAsideItem.isSetAside = false;
      });
      finishAdding([id]);
      return;
    }
    if (row.alreadyListedId) setPendingAlreadyListed(row);
    else commit([row]);
  };

  const resolveAlreadyListed = (isKeptBoth: boolean) => {
    if (pendingAlreadyListed) commit([{ ...pendingAlreadyListed, isKeptBoth }]);
  };

  const pasteText = (pasted: string): boolean => {
    if (!hasMultipleLines(pasted)) return false;
    const rows = pastedReviewRows(pasted, items, keptBoth, known, memory);
    if (rows.length) setPaste({ source: PASTE_SOURCE, rows });
    return true;
  };

  const updatePasteRows = (recipe: (rows: MaterialReviewRow[]) => MaterialReviewRow[]) =>
    setPaste(current => {
      if (!current) return current;
      const rows = recipe(current.rows);
      return rows.length ? { ...current, rows } : undefined;
    });

  const setPasteRowKind = (index: number, { group, type }: MaterialTypeSelection) =>
    updatePasteRows(rows =>
      rows.map((row, at) =>
        at === index
          ? {
              ...row,
              item: produce(row.item, draft => applyMaterialType(draft, group, type, memory)),
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

  const removePasteRow = (index: number) =>
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
    pendingAlreadyListed,
    paste,
    inputRef,
    changeText,
    chooseKind,
    clear,
    submit,
    resolveAlreadyListed,
    pasteText,
    setPasteRowKind,
    togglePasteKeep,
    removePasteRow,
    addPasted,
    cancelPaste: () => setPaste(undefined),
  };
}

export type MaterialAdding = ReturnType<typeof useMaterialAdding>;
