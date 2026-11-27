import {
  kindIndex,
  nameKey,
  type BoardName,
  type KindIndex,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import { listedMaterials } from '../materials/materialLookup';
import { ownerNamed } from '../materials/plateLinks';
import { stainedSampleCounts } from '../plateMap/stainSide';
import {
  COCKTAIL,
  COCKTAIL_VOLUME_PER_WELL,
  perLabwareKind,
  SAMPLE_NOUNS,
  VOLUME_PER_WELL,
  WELLS,
  type SampleNoun,
} from '../terms/termList';
import { findTerm, findTermOn } from '../terms/termLookup';
import { GENERAL, joinValueName, lowerLead } from '../values/valueNames';

import { panelCocktails } from './flowCytometryCocktails';
import { dosedRows } from './flowCytometryPanel';
import { markerDose, type MarkerDose } from './markerAmount';

import type { FlowCytometryPanel, MaterialItem, Protocol, Stain } from '@odysseus/shared-schemas';

const SHARE_UNIT = '%';
const PIPETTED_UNIT = 'µL';

type SampleCounts = ReadonlyMap<string, ReadonlyMap<SampleNoun, number>>;

const nounEnd = (noun: SampleNoun) => (noun === 'well' ? '' : `:${noun}`);

const pluralOf = (noun: SampleNoun) => lowerLead(perLabwareKind(WELLS, noun).word);

export const stainAmountId = (rowId: string, noun: SampleNoun): string =>
  `${rowId}:amount${nounEnd(noun)}`;

export const cocktailWellsId = (panelId: string, cocktailKey: string, noun: SampleNoun): string =>
  `${panelId}:${cocktailKey}:wells${nounEnd(noun)}`;

export const cocktailAntibodiesId = (
  panelId: string,
  cocktailKey: string,
  noun: SampleNoun
): string => `${panelId}:${cocktailKey}:antibodies${nounEnd(noun)}`;

export function stainSampleNouns(stains: readonly Stain[], samples: SampleCounts): SampleNoun[] {
  const found = SAMPLE_NOUNS.filter(noun => stains.some(stain => samples.get(stain.id)?.has(noun)));
  return found.length ? found : ['well'];
}

export const cocktailAntibodiesName = (
  cocktailName: string,
  noun: SampleNoun,
  isSplit: boolean
): string => `${cocktailName} antibodies${isSplit ? ` in the ${pluralOf(noun)}` : ''}`;

function panelNames(
  protocol: Protocol,
  panel: FlowCytometryPanel,
  materials: ReadonlyMap<string, MaterialItem>,
  samples: SampleCounts,
  taken: Set<string>,
  ownNames: ReadonlyMap<string, BoardName>,
  kinds: KindIndex
): BoardName[] {
  const origin = { type: 'flowCytometryPanel', shows: panel.id } as const;
  const claim = (name: string) => {
    const isFree = !taken.has(nameKey(name));
    taken.add(nameKey(name));
    return isFree;
  };
  const { stainings } = panelCocktails(panel);
  const nounsByStaining = new Map(
    stainings.map(({ staining, cocktails }) => [
      nameKey(staining),
      stainSampleNouns(
        cocktails.flatMap(cocktail => cocktail.stains),
        samples
      ),
    ])
  );
  const nounsFor = (staining: string): SampleNoun[] =>
    nounsByStaining.get(nameKey(staining)) ?? ['well'];
  const volumeFor = (staining: string, noun: SampleNoun) => {
    const find = nounsFor(staining).length > 1 ? findTermOn : findTerm;
    return find(
      kinds,
      COCKTAIL_VOLUME_PER_WELL,
      [ownerNamed(protocol, staining), GENERAL],
      noun
    )?.name.trim();
  };
  const missingVolume = (staining: string, noun: SampleNoun) => {
    const { word } = perLabwareKind(COCKTAIL_VOLUME_PER_WELL, noun);
    return `Needs "${joinValueName(staining, word)}" or "${word}" in Values`;
  };
  const doses = new Map(
    dosedRows(panel).flatMap(row => {
      const material = materials.get(row.materialId);
      const staining = row.staining.trim();
      if (!material) return [];
      const byNoun = new Map<SampleNoun, MarkerDose>(
        nounsFor(staining).map(noun => [
          noun,
          markerDose(material, ownNames, staining ? volumeFor(staining, noun) : undefined),
        ])
      );
      return [[row.id, byNoun] as const];
    })
  );

  const cocktails = stainings.flatMap(({ staining, cocktails: stainingCocktails }) => {
    const nouns = nounsFor(staining);
    const isSplit = nouns.length > 1;
    return stainingCocktails.flatMap(cocktail => {
      if (!cocktail.name) return [];
      const group: WorkedOutGroup = {
        key: `cocktail:${panel.id}:${cocktail.key}`,
        subject: cocktail.name,
        title: COCKTAIL,
        settings: origin,
      };
      const rows = cocktail.rows.filter(row => doses.has(row.id));
      return nouns.flatMap((noun): BoardName[] => {
        const wellsName = `${cocktail.name} ${pluralOf(noun)}`;
        const count: BoardName[] = claim(wellsName)
          ? [
              {
                kind: 'count',
                id: cocktailWellsId(panel.id, cocktail.key, noun),
                name: wellsName,
                count: cocktail.stains.reduce(
                  (sum, stain) => sum + (samples.get(stain.id)?.get(noun) ?? 0),
                  0
                ),
                workedOut: group,
                origin,
              },
            ]
          : [];
        if (!rows.length) return count;
        const antibodiesName = cocktailAntibodiesName(cocktail.name, noun, isSplit);
        if (!claim(antibodiesName)) return count;
        const doseOf = (rowId: string) => doses.get(rowId)?.get(noun);
        const unshared = rows.find(row => !doseOf(row.id)?.share);
        const unsharedDose = unshared && doseOf(unshared.id);
        const problem =
          unshared &&
          (unsharedDose?.problem
            ? `${materials.get(unshared.materialId)?.name.trim()} ${lowerLead(unsharedDose.problem)}`
            : missingVolume(unshared.staining.trim(), noun));
        return [
          ...count,
          {
            kind: 'calculation',
            id: cocktailAntibodiesId(panel.id, cocktail.key, noun),
            name: antibodiesName,
            formula: problem ? '' : rows.map(row => doseOf(row.id)?.share).join(' + '),
            unit: SHARE_UNIT,
            workedOut: group,
            origin,
            ...(problem && { problem }),
          },
        ];
      });
    });
  });
  const perWell = dosedRows(panel).flatMap(row => {
    const material = materials.get(row.materialId);
    const byNoun = doses.get(row.id);
    if (!material || !byNoun) return [];
    const materialName = material.name.trim();
    const staining = row.staining.trim();
    return [...byNoun].flatMap(([noun, dose]): BoardName[] => {
      const { word } = perLabwareKind(VOLUME_PER_WELL, noun);
      const name = joinValueName(materialName, word);
      if (!claim(name)) return [];
      const problem = !staining
        ? 'Needs a staining, e.g. Surface'
        : (dose.problem ?? (dose.perWell ? undefined : missingVolume(staining, noun)));
      return [
        {
          kind: 'calculation',
          id: stainAmountId(row.id, noun),
          name,
          formula: problem ? '' : (dose.perWell ?? ''),
          unit: PIPETTED_UNIT,
          kindOf: { term: VOLUME_PER_WELL.key, noun, owner: material.id },
          workedOut: {
            key: `amount:${row.id}${nounEnd(noun)}`,
            subject: materialName,
            title: word,
            settings: origin,
          },
          origin,
          ...(problem && { problem }),
        },
      ];
    });
  });
  return [...cocktails, ...perWell];
}

export function flowCytometryCalculationNames(
  protocol: Protocol,
  taken: readonly BoardName[]
): BoardName[] {
  const materials = new Map(listedMaterials(protocol).map(item => [item.id, item]));
  const samples = stainedSampleCounts(protocol.plateMaps);
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const ownNames = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  return protocol.flowCytometryPanels.flatMap(panel =>
    panelNames(protocol, panel, materials, samples, takenKeys, ownNames, kindIndex(taken, false))
  );
}
