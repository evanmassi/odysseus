import { produce } from 'immer';
import { create } from 'zustand';

import { calculateBoard, type SolvedBoard } from '../utils/formulas/boardCalculation';
import { collectBoardNames } from '../utils/formulas/boardNames';
import { applyRenames, findRenames } from '../utils/formulas/nameRenames';
import { removeValuesTwinnedByPlate } from '../utils/plateMap/plateEditEffects';
import { blankProtocol } from '../utils/protocolFile/blankProtocol';

import type { Protocol } from '@odysseus/shared-schemas';

const RENAME_PASSES = 3;
const MOST_UNDO_STEPS = 100;
const SAME_STEP_WITHIN_MS = 1000;

interface Snapshot {
  protocol: Protocol;
  knownNames: ReadonlyMap<string, string>;
  revision: number;
}

interface WorkbenchState {
  protocol: Protocol;
  board: SolvedBoard;
  knownNames: ReadonlyMap<string, string>;
  activePageId: string;
  fileName: string;
  revision: number;
  newestRevision: number;
  savedRevision: number;
  past: readonly Snapshot[];
  future: readonly Snapshot[];
  openProtocol: (protocol: Protocol, fileName: string, isSaved?: boolean) => void;
  updateProtocol: (recipe: (draft: Protocol) => void) => void;
  fitCardHeight: (cardId: string, height: number) => void;
  showPage: (pageId: string) => void;
  markSaved: (fileName: string) => void;
  undo: () => void;
  redo: () => void;
}

let lastBoard: { inputs: string; board: SolvedBoard } | undefined;
let lastEditAt = 0;

const plateMapsOf = (protocol: Protocol) => protocol.blocks.filter(card => card.type === 'plate');

function haveSamePlateMaps(before: Protocol, after: Protocol): boolean {
  const [was, now] = [plateMapsOf(before), plateMapsOf(after)];
  return was.length === now.length && was.every((card, index) => card === now[index]);
}

function calculate(protocol: Protocol): SolvedBoard {
  const names = collectBoardNames(protocol);
  const inputs = JSON.stringify(names);
  if (lastBoard?.inputs !== inputs) lastBoard = { inputs, board: calculateBoard(names) };
  return lastBoard.board;
}

const namesById = (board: SolvedBoard, known: ReadonlyMap<string, string> = new Map()) => {
  const names = new Map(known);
  for (const entry of board.names.values()) names.set(entry.id, entry.name);
  return names;
};

function reconcile(protocol: Protocol, previousNames: ReadonlyMap<string, string>) {
  let next = protocol;
  let known = previousNames;
  let board = calculate(next);
  for (let pass = 0; pass < RENAME_PASSES; pass++) {
    const renames = findRenames(known, board);
    if (!renames) break;
    const namesBeforePass = known;
    next = produce(next, draft => applyRenames(draft, namesBeforePass, renames));
    known = namesById(board, known);
    board = calculate(next);
  }
  return { protocol: next, board, knownNames: namesById(board, known) };
}

function freshDocument(protocol: Protocol) {
  const board = calculate(protocol);
  return {
    protocol,
    board,
    knownNames: namesById(board),
    activePageId: protocol.pages[0].id,
  };
}

const snapshotOf = (state: WorkbenchState): Snapshot => ({
  protocol: state.protocol,
  knownNames: state.knownNames,
  revision: state.revision,
});

function restored(snapshot: Snapshot, state: WorkbenchState) {
  const pageStillExists = snapshot.protocol.pages.some(page => page.id === state.activePageId);
  return {
    protocol: snapshot.protocol,
    knownNames: snapshot.knownNames,
    board: calculate(snapshot.protocol),
    revision: snapshot.revision,
    activePageId: pageStillExists ? state.activePageId : snapshot.protocol.pages[0].id,
  };
}

export const useWorkbenchStore = create<WorkbenchState>(set => ({
  ...freshDocument(blankProtocol()),
  fileName: '',
  revision: 0,
  newestRevision: 0,
  savedRevision: 0,
  past: [],
  future: [],

  openProtocol: (protocol, fileName, isSaved = true) =>
    set(state => {
      lastEditAt = 0;
      const revision = state.newestRevision + 1;
      return {
        ...freshDocument(protocol),
        fileName,
        revision,
        newestRevision: revision,
        savedRevision: isSaved ? revision : state.savedRevision,
        past: [],
        future: [],
      };
    }),

  updateProtocol: recipe =>
    set(state => {
      const edited = produce(state.protocol, recipe);
      if (edited === state.protocol) return {};
      const changed = haveSamePlateMaps(state.protocol, edited)
        ? edited
        : produce(edited, draft => {
            removeValuesTwinnedByPlate(draft, state.knownNames);
          });
      const reconciled = reconcile(changed, state.knownNames);
      const now = Date.now();
      const isSameStep = now - lastEditAt < SAME_STEP_WITHIN_MS && state.past.length > 0;
      lastEditAt = now;
      const revision = state.newestRevision + 1;
      const pageStillExists = reconciled.protocol.pages.some(
        page => page.id === state.activePageId
      );
      return {
        ...reconciled,
        activePageId: pageStillExists ? state.activePageId : reconciled.protocol.pages[0].id,
        revision,
        newestRevision: revision,
        past: isSameStep ? state.past : [...state.past, snapshotOf(state)].slice(-MOST_UNDO_STEPS),
        future: [],
      };
    }),

  fitCardHeight: (cardId, height) =>
    set(state => ({
      protocol: produce(state.protocol, draft => {
        const card = draft.blocks.find(candidate => candidate.id === cardId);
        if (card) card.h = height;
      }),
    })),

  showPage: pageId => set({ activePageId: pageId }),

  markSaved: fileName => set(state => ({ fileName, savedRevision: state.revision })),

  undo: () =>
    set(state => {
      const previous = state.past.at(-1);
      if (!previous) return {};
      lastEditAt = 0;
      return {
        ...restored(previous, state),
        past: state.past.slice(0, -1),
        future: [snapshotOf(state), ...state.future],
      };
    }),

  redo: () =>
    set(state => {
      const [next, ...later] = state.future;
      if (!next) return {};
      lastEditAt = 0;
      return {
        ...restored(next, state),
        past: [...state.past, snapshotOf(state)],
        future: later,
      };
    }),
}));

export const selectIsDirty = (state: WorkbenchState): boolean =>
  state.revision !== state.savedRevision;
