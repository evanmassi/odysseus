import { useEffect, useRef, useState } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { followWellEdit } from '../../../../utils/materials/renameFollowing';
import { heldNames, type HeldName } from '../../../../utils/plateMap/wellEdits';

import type { PlateMapCard } from '@odysseus/shared-schemas';

const NOTHING_HELD: ReadonlyMap<string, HeldName> = new Map();

const plateMapNow = (cardId: string) =>
  useWorkbenchStore
    .getState()
    .protocol.blocks.find(
      (card): card is PlateMapCard => card.id === cardId && card.type === 'plate'
    );

export function useWellEditSession(
  cardId: string,
  keys: ReadonlySet<string>,
  isEditorOpen: boolean
): ReadonlyMap<string, HeldName> {
  const [started, setStarted] = useState(NOTHING_HELD);
  const [editorClosings, setEditorClosings] = useState(0);
  const wasEditorOpen = useRef(isEditorOpen);

  useEffect(() => {
    if (wasEditorOpen.current && !isEditorOpen) setEditorClosings(count => count + 1);
    wasEditorOpen.current = isEditorOpen;
  }, [isEditorOpen]);

  useEffect(() => {
    const keyList = [...keys];
    const plateMap = plateMapNow(cardId);
    const startedNow = plateMap && keyList.length ? heldNames(plateMap, keyList) : NOTHING_HELD;
    setStarted(startedNow);
    return () => {
      if (!startedNow.size) return;
      useWorkbenchStore
        .getState()
        .updateProtocol(draft => followWellEdit(draft, cardId, startedNow, keyList));
    };
  }, [cardId, keys, editorClosings]);

  return started;
}
