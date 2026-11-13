import { useEffect, useRef, useState } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { followWellEdit } from '../../../../utils/materials/renameFollowing';
import { heldNames, type HeldName } from '../../../../utils/vessels/wellEdits';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const NOTHING_HELD: ReadonlyMap<string, HeldName> = new Map();

const vesselMapNow = (blockId: string) =>
  useWorkbenchStore
    .getState()
    .protocol.blocks.find(
      (block): block is VesselMapBlock => block.id === blockId && block.type === 'plate'
    );

export function useWellEditSession(
  blockId: string,
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
    const plate = vesselMapNow(blockId);
    const startedNow = plate && keyList.length ? heldNames(plate, keyList) : NOTHING_HELD;
    setStarted(startedNow);
    return () => {
      if (!startedNow.size) return;
      useWorkbenchStore
        .getState()
        .updateProtocol(draft => followWellEdit(draft, blockId, startedNow, keyList));
    };
  }, [blockId, keys, editorClosings]);

  return started;
}
