import { nameKey } from '../formulas/boardCalculation';
import { donorsIn } from '../materials/materialDonors';
import { listedMaterials, nameWithoutNotes, shortNameOf } from '../materials/materialLookup';

import { SAMPLE_NOUNS } from './termList';
import { termOfName } from './termLookup';

import type { BoardKind } from '../formulas/boardCalculation';
import type { Protocol, SavedTerm } from '@odysseus/shared-schemas';

export const boardKind = (term: SavedTerm | undefined, owner: string): BoardKind | undefined =>
  term && {
    term: term.key,
    noun: SAMPLE_NOUNS.find(noun => noun === term.noun),
    owner,
  };

const isSameTerm = (a: SavedTerm | undefined, b: SavedTerm) =>
  a?.key === b.key && a.noun === b.noun && a.of === b.of;

function keepTerm(
  holder: { term?: SavedTerm },
  name: string,
  unit: string,
  ownerKeys: ReadonlySet<string> | undefined
): void {
  const term = termOfName(name, unit, ownerKeys);
  if (term && !isSameTerm(holder.term, term)) holder.term = term;
}

function ownerKeysOf(protocol: Protocol): ReadonlySet<string> {
  const materials = listedMaterials(protocol);
  return new Set(
    [
      ...materials.flatMap(item => [item.name, nameWithoutNotes(item.name), shortNameOf(item)]),
      ...donorsIn(protocol).map(({ donor }) => donor.name),
      ...protocol.flowCytometryPanels.flatMap(panel => panel.markers.map(row => row.staining)),
      ...protocol.plateMaps.flatMap(plateMap =>
        plateMap.lines.flatMap(line => line.values.map(value => value.text))
      ),
    ]
      .map(nameKey)
      .filter(Boolean)
  );
}

export function keepRecognizedTerms(draft: Protocol): void {
  const ownerKeys = ownerKeysOf(draft);
  for (const item of draft.values.items) {
    if ('name' in item) keepTerm(item, item.name, item.unit, item.row ? undefined : ownerKeys);
  }
  for (const item of draft.calculations.items) {
    keepTerm(item, item.name, item.unit, item.materialId ? undefined : ownerKeys);
  }
}
