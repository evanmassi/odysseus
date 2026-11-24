import { current, produce } from 'immer';

import {
  calculateBoard,
  nameKey,
  quantityOfName,
  type SolvedBoard,
} from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { followOldNames } from '../formulas/nameRenames';
import { isSameDimension, quantityOf } from '../formulas/quantities';
import { materialNamed } from '../materials/materialLookup';
import { EXTRA, TOTAL_WELL_VOLUME } from '../terms/termList';
import { addNamedValue } from '../values/valueEdits';
import { lowerLead } from '../values/valueNames';

import {
  ownPrepValueName,
  SHARED_PREP_KEYS,
  SHARED_PREP_VALUES,
  sharedPrepSource,
  type SharedPrepKey,
} from './dilutionCalculations';
import { dilutionRuns, runTags, type DilutionRun } from './dilutionRuns';

import type { MovedPrepValue, Protocol } from '@odysseus/shared-schemas';

const OLD_INPUT_LABELS: Readonly<Record<SharedPrepKey, string>> = {
  totalWellVolume: lowerLead(TOTAL_WELL_VOLUME.word),
  volumePerWell: 'volume added',
  extra: lowerLead(EXTRA.word),
};

const SAME_NUMBER_TOLERANCE = 1e-9;

const boardOf = (draft: Protocol): SolvedBoard => calculateBoard(collectBoardNames(current(draft)));

function givesSameNumber(board: SolvedBoard, name: string, value: string, unit: string): boolean {
  const entry = board.names.get(nameKey(name));
  const shared = entry && quantityOfName(board, entry);
  const typed = quantityOf(value, unit);
  return (
    !!shared &&
    !!typed &&
    isSameDimension(shared.dimension, typed.dimension) &&
    Math.abs(shared.magnitude - typed.magnitude) <=
      SAME_NUMBER_TOLERANCE * Math.abs(typed.magnitude)
  );
}

function runOf(runs: readonly DilutionRun[], { plateId, seriesId }: MovedPrepValue) {
  return runs.find(run =>
    run.members.some(member => member.plateId === plateId && member.seriesId === seriesId)
  );
}

export function withMovedPrepValues(
  protocol: Protocol,
  moved: readonly MovedPrepValue[]
): Protocol {
  if (!moved.length) return protocol;
  const runs = dilutionRuns(protocol);
  const tags = runTags(runs);
  const pageId =
    protocol.cards.find(card => card.type === 'dilutions')?.page ?? protocol.pages[0]?.id ?? '';
  return produce(protocol, draft => {
    const byOldName = new Map<string, string>();
    for (const values of moved) {
      const run = runOf(runs, values);
      const tag = run && tags.get(run.key);
      if (!run || tag === undefined) continue;
      for (const key of SHARED_PREP_KEYS) {
        const value = values[key];
        if (!value) continue;
        const { unit } = SHARED_PREP_VALUES[key];
        const board = boardOf(draft);
        const found = sharedPrepSource(board.names, run.subject, key);
        const keptName =
          found && (!found.isAssaySetup || givesSameNumber(board, found.entry.name, value, unit))
            ? found.entry.name
            : undefined;
        const sharedName = keptName ?? ownPrepValueName(run.subject, key);
        if (!keptName) {
          addNamedValue(
            draft,
            { name: sharedName, value, unit },
            materialNamed(draft, run.subject),
            pageId
          );
        }
        const oldName = `${run.subject} ${OLD_INPUT_LABELS[key]}${tag}`;
        if (nameKey(oldName) !== nameKey(sharedName)) byOldName.set(nameKey(oldName), sharedName);
      }
    }
    followOldNames(draft, byOldName);
  });
}
