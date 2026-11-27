import { nameKey } from '../formulas/boardCalculation';
import { donorsIn } from '../materials/materialDonors';
import { listedMaterials, nameWithoutNotes, shortNameOf } from '../materials/materialLookup';
import { labwareOf } from '../plateMap/labwareCatalog';

import { ASSAY_SETUP_TERMS, isPerSample, perLabwareKind, SAMPLE_NOUNS, TERMS } from './termList';
import { termOfName } from './termLookup';

import type { BoardKind } from '../formulas/boardCalculation';
import type { Protocol, SavedTerm, ValueItem } from '@odysseus/shared-schemas';

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

export function termWord(term: SavedTerm): string {
  const found = TERMS.find(candidate => candidate.key === term.key);
  const noun = SAMPLE_NOUNS.find(candidate => candidate === term.noun);
  return found ? (noun ? perLabwareKind(found, noun) : found).word : term.key;
}

interface Named {
  name: string;
  unit: string;
  term?: SavedTerm;
}

export function isTermUnsaid(holder: Named): boolean {
  if (!holder.term) return false;
  const ownerKeys = new Set(holder.term.of ? [nameKey(holder.term.of)] : []);
  const said = termOfName(holder.name, holder.unit, ownerKeys);
  return !said || !isSameTerm(holder.term, said);
}
type TypedItem = Extract<ValueItem, { name: string }>;

const isLooseItem = (item: ValueItem): item is TypedItem => 'name' in item && !item.row;

export interface KindChoice {
  term: SavedTerm;
  label: string;
  heldBy: string | undefined;
}

function nounsInUse(protocol: Pick<Protocol, 'plateMaps'>) {
  const kinds = new Set<string>(
    protocol.plateMaps.flatMap(plateMap => [
      ...plateMap.plates.map(plate => labwareOf(plate.labware).kind),
      ...plateMap.otherLabware.map(set => labwareOf(set.labware).kind),
    ])
  );
  return SAMPLE_NOUNS.filter(noun => noun === 'well' || kinds.has(noun));
}

export function looseKindChoices(
  protocol: Pick<Protocol, 'values' | 'plateMaps'>,
  itemId: string
): KindChoice[] {
  const others = protocol.values.items.filter(isLooseItem).filter(item => item.id !== itemId);
  return ASSAY_SETUP_TERMS.flatMap(term =>
    (isPerSample(term) ? nounsInUse(protocol) : [undefined]).map(noun => {
      const saved: SavedTerm = { key: term.key, ...(noun && { noun }) };
      return {
        term: saved,
        label: termWord(saved),
        heldBy: others.find(item => isSameTerm(item.term, saved))?.name,
      };
    })
  );
}

export function setLooseTerm(draft: Protocol, itemId: string, term: SavedTerm | undefined): void {
  const loose = draft.values.items.filter(isLooseItem);
  const item = loose.find(candidate => candidate.id === itemId);
  if (!item) return;
  if (!term) {
    delete item.term;
    return;
  }
  item.term = term;
  for (const other of loose) {
    if (other !== item && isSameTerm(other.term, term) && isTermUnsaid(other)) {
      delete other.term;
    }
  }
}
