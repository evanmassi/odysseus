import { produce } from 'immer';
import { create } from 'zustand';

import { calculateBoard, type BoardCalculation } from '../utils/formulas/boardCalculation';
import { collectBoardNames } from '../utils/formulas/boardNames';
import { applyRenames, findRenames } from '../utils/formulas/nameRenames';
import { blankProtocol } from '../utils/protocolFile/blankProtocol';

import type { Protocol } from '@odysseus/shared-schemas';

const RENAME_PASSES = 3;

interface WorkbenchState {
  protocol: Protocol;
  calculation: BoardCalculation;
  knownNames: ReadonlyMap<string, string>;
  activePageId: string;
  fileName: string;
  revision: number;
  savedRevision: number;
  openProtocol: (protocol: Protocol, fileName: string, isSaved?: boolean) => void;
  updateProtocol: (recipe: (draft: Protocol) => void) => void;
  fitBlockHeight: (blockId: string, height: number) => void;
  showPage: (pageId: string) => void;
  markSaved: (fileName: string) => void;
}

const calculate = (protocol: Protocol) => calculateBoard(collectBoardNames(protocol));

const namesById = (
  calculation: BoardCalculation,
  known: ReadonlyMap<string, string> = new Map()
) => {
  const names = new Map(known);
  for (const entry of calculation.names.values()) names.set(entry.id, entry.name);
  return names;
};

function reconcile(protocol: Protocol, previousNames: ReadonlyMap<string, string>) {
  let next = protocol;
  let known = previousNames;
  let calculation = calculate(next);
  for (let pass = 0; pass < RENAME_PASSES; pass++) {
    const renames = findRenames(known, calculation);
    if (!renames) break;
    const namesBeforePass = known;
    next = produce(next, draft => applyRenames(draft, namesBeforePass, renames));
    known = namesById(calculation, known);
    calculation = calculate(next);
  }
  return { protocol: next, calculation, knownNames: namesById(calculation, known) };
}

function freshDocument(protocol: Protocol) {
  const calculation = calculate(protocol);
  return {
    protocol,
    calculation,
    knownNames: namesById(calculation),
    activePageId: protocol.pages[0].id,
  };
}

export const useWorkbenchStore = create<WorkbenchState>(set => ({
  ...freshDocument(blankProtocol()),
  fileName: '',
  revision: 0,
  savedRevision: 0,

  openProtocol: (protocol, fileName, isSaved = true) =>
    set(state => ({
      ...freshDocument(protocol),
      fileName,
      revision: state.revision + 1,
      savedRevision: isSaved ? state.revision + 1 : state.revision,
    })),

  updateProtocol: recipe =>
    set(state => {
      const changed = produce(state.protocol, recipe);
      if (changed === state.protocol) return {};
      const reconciled = reconcile(changed, state.knownNames);
      const pageStillExists = reconciled.protocol.pages.some(
        page => page.id === state.activePageId
      );
      return {
        ...reconciled,
        activePageId: pageStillExists ? state.activePageId : reconciled.protocol.pages[0].id,
        revision: state.revision + 1,
      };
    }),

  fitBlockHeight: (blockId, height) =>
    set(state => ({
      protocol: produce(state.protocol, draft => {
        const block = draft.blocks.find(candidate => candidate.id === blockId);
        if (block) block.h = height;
      }),
    })),

  showPage: pageId => set({ activePageId: pageId }),

  markSaved: fileName => set(state => ({ fileName, savedRevision: state.revision })),
}));

export const selectIsDirty = (state: WorkbenchState): boolean =>
  state.revision !== state.savedRevision;
