import { nameKey, type BoardName, type WorkedOutGroup } from '../formulas/boardCalculation';
import { stainedWellCounts } from '../plateMap/stainSide';
import { COCKTAIL, COCKTAIL_VOLUME_PER_WELL, VOLUME_PER_WELL } from '../terms/termList';
import { findTerm } from '../terms/termLookup';
import { joinValueName, lowerLead } from '../values/valueNames';

import { panelCocktails } from './flowCytometryCocktails';
import { markerDose } from './markerAmount';

import type {
  FlowCytometryPanelCard,
  MaterialItem,
  Protocol,
  PlateMapCard,
} from '@odysseus/shared-schemas';

const SHARE_UNIT = '%';
const PIPETTED_UNIT = 'µL';

export const stainAmountId = (rowId: string): string => `${rowId}:amount`;

export const cocktailWellsId = (cardId: string, cocktailKey: string): string =>
  `${cardId}:${cocktailKey}:wells`;

export const cocktailAntibodiesId = (cardId: string, cocktailKey: string): string =>
  `${cardId}:${cocktailKey}:antibodies`;

function cardNames(
  card: FlowCytometryPanelCard,
  materials: ReadonlyMap<string, MaterialItem>,
  wells: ReadonlyMap<string, number>,
  taken: Set<string>,
  ownNames: ReadonlyMap<string, BoardName>
): BoardName[] {
  const claim = (name: string) => {
    const isFree = !taken.has(nameKey(name));
    taken.add(nameKey(name));
    return isFree;
  };
  const volumeFor = (staining: string) =>
    findTerm(ownNames, COCKTAIL_VOLUME_PER_WELL, [staining, ''])?.name.trim();
  const missingVolume = (staining: string) =>
    `Needs "${joinValueName(staining, COCKTAIL_VOLUME_PER_WELL.word)}" or "${COCKTAIL_VOLUME_PER_WELL.word}" in Values`;
  const doses = new Map(
    card.markers.flatMap(row => {
      const material = materials.get(row.materialId);
      const staining = row.staining.trim();
      return material
        ? [[row.id, markerDose(material, ownNames, staining ? volumeFor(staining) : undefined)]]
        : [];
    })
  );

  const cocktails = panelCocktails(card).stainings.flatMap(staining =>
    staining.cocktails.flatMap((cocktail): BoardName[] => {
      if (!cocktail.name) return [];
      const group: WorkedOutGroup = {
        key: `cocktail:${card.id}:${cocktail.key}`,
        subject: cocktail.name,
        title: COCKTAIL,
        settingsCardId: card.id,
      };
      const wellsName = `${cocktail.name} wells`;
      const count: BoardName[] = claim(wellsName)
        ? [
            {
              kind: 'count',
              id: cocktailWellsId(card.id, cocktail.key),
              name: wellsName,
              count: cocktail.stains.reduce((sum, stain) => sum + (wells.get(stain.id) ?? 0), 0),
              workedOut: group,
              originCardId: card.id,
            },
          ]
        : [];
      const rows = cocktail.rows.filter(row => doses.has(row.id));
      if (!rows.length) return count;
      const antibodiesName = `${cocktail.name} antibodies`;
      if (!claim(antibodiesName)) return count;
      const unshared = rows.find(row => !doses.get(row.id)?.share);
      const unsharedDose = unshared && doses.get(unshared.id);
      const problem =
        unshared &&
        (unsharedDose?.problem
          ? `${materials.get(unshared.materialId)?.name.trim()} ${lowerLead(unsharedDose.problem)}`
          : missingVolume(unshared.staining.trim()));
      return [
        ...count,
        {
          kind: 'calculation',
          id: cocktailAntibodiesId(card.id, cocktail.key),
          name: antibodiesName,
          formula: problem ? '' : rows.map(row => doses.get(row.id)?.share).join(' + '),
          unit: SHARE_UNIT,
          workedOut: group,
          originCardId: card.id,
          ...(problem && { problem }),
        },
      ];
    })
  );
  const perWell = card.markers.flatMap((row): BoardName[] => {
    const material = materials.get(row.materialId);
    const dose = doses.get(row.id);
    if (!material || !dose) return [];
    const materialName = material.name.trim();
    const name = joinValueName(materialName, VOLUME_PER_WELL.word);
    if (!claim(name)) return [];
    const staining = row.staining.trim();
    const problem = !staining
      ? 'Needs a staining, e.g. Surface'
      : (dose.problem ?? (dose.perWell ? undefined : missingVolume(staining)));
    return [
      {
        kind: 'calculation',
        id: stainAmountId(row.id),
        name,
        formerName: `${materialName} amount per well`,
        formula: problem ? '' : (dose.perWell ?? ''),
        unit: PIPETTED_UNIT,
        workedOut: {
          key: `amount:${row.id}`,
          subject: materialName,
          title: VOLUME_PER_WELL.word,
          settingsCardId: card.id,
        },
        originCardId: card.id,
        ...(problem && { problem }),
      },
    ];
  });
  return [...cocktails, ...perWell];
}

export function flowCytometryCalculationNames(
  protocol: Protocol,
  taken: readonly BoardName[]
): BoardName[] {
  const materials = new Map(
    protocol.cards
      .flatMap(card => (card.type === 'materials' ? card.items : []))
      .filter(item => item.name.trim() && !item.isSetAside)
      .map(item => [item.id, item])
  );
  const wells = stainedWellCounts(
    protocol.cards.filter((card): card is PlateMapCard => card.type === 'plateMap')
  );
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const ownNames = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  return protocol.cards.flatMap(card =>
    card.type === 'flowCytometryPanel' ? cardNames(card, materials, wells, takenKeys, ownNames) : []
  );
}
