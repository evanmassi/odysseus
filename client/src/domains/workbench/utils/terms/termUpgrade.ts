import { produce } from 'immer';

import { calculateBoard, nameKey, type BoardName } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { applyReferenceRenames } from '../formulas/nameRenames';
import { LABWARE_KIND_PLURALS } from '../plateMap/labwareCatalog';

import { PER_WELL_TERMS, perLabwareKind, TERMS } from './termList';
import { settledValue } from './termLookup';

import type { Protocol } from '@odysseus/shared-schemas';

const OTHER_LABWARE_KINDS = Object.keys(LABWARE_KIND_PLURALS).filter(noun => noun !== 'well');

const TERMS_ON_ANY_LABWARE_KIND = [
  ...TERMS,
  ...PER_WELL_TERMS.flatMap(term => OTHER_LABWARE_KINDS.map(noun => perLabwareKind(term, noun))),
];

function fileValuesUnderWords(draft: Protocol) {
  for (const card of draft.cards) {
    if (card.type !== 'values') continue;
    for (const item of card.items) {
      if (!('name' in item) || !item.unit) continue;
      const { label } = settledValue(item.name, item.unit);
      const isTaken = card.items.some(
        other => 'name' in other && other.row === item.row && nameKey(other.name) === nameKey(label)
      );
      if (!isTaken) item.name = label;
    }
  }
}

function oldSpellings(names: ReadonlyMap<string, BoardName>): Map<string, string> {
  const byOldName = new Map<string, string>();
  for (const entry of names.values()) {
    const name = entry.name.trim();
    const lower = name.toLowerCase();
    const former = entry.kind === 'calculation' ? entry.formerName?.toLowerCase() : undefined;
    if (former && !names.has(former) && !byOldName.has(former)) byOldName.set(former, name);
    for (const term of TERMS_ON_ANY_LABWARE_KIND) {
      const word = term.word.toLowerCase();
      const at = lower.indexOf(word);
      const end = at + word.length;
      const isWholeWords =
        at >= 0 &&
        (at === 0 || lower[at - 1] === ' ') &&
        (end === lower.length || lower[end] === ' ');
      if (!isWholeWords) continue;
      for (const spelling of [...term.alsoAccepted, ...(term.formerly ?? [])]) {
        const old = `${lower.slice(0, at)}${spelling.toLowerCase()}${lower.slice(end)}`;
        if (!names.has(old) && !byOldName.has(old)) byOldName.set(old, name);
      }
    }
  }
  return byOldName;
}

export function withSettledWords(protocol: Protocol): Protocol {
  const filed = produce(protocol, fileValuesUnderWords);
  const { names } = calculateBoard(collectBoardNames(filed));
  const byOldName = oldSpellings(names);
  if (!byOldName.size) return filed;
  const scanned = new Map(
    [...byOldName.keys(), ...[...names.values()].map(entry => entry.name)].map(name => [name, name])
  );
  return produce(filed, draft =>
    applyReferenceRenames(draft, scanned, { byOldName, byItemPrefix: new Map() })
  );
}
