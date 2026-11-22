import { nameKey, type BoardName, type WorkedOutGroup } from '../formulas/boardCalculation';
import { RATIO_NOTATION } from '../formulas/quantities';
import { stainedWellCounts } from '../plateMap/stainSide';
import { COCKTAIL, COCKTAIL_VOLUME_PER_WELL } from '../terms/termList';
import { findTerm } from '../terms/termLookup';
import { joinValueName } from '../values/valueNames';

import { panelCocktails } from './flowCytometryCocktails';

import type { FlowCytometryPanelCard, Protocol, PlateMapCard } from '@odysseus/shared-schemas';

const SHARE_UNIT = '%';
const PIPETTED_UNIT = 'µL';

export const dilutionFactorName = (materialName: string): string =>
  `${materialName.trim()} dilution factor`;

export const stainAmountId = (rowId: string): string => `${rowId}:amount`;

export const cocktailWellsId = (cardId: string, cocktailKey: string): string =>
  `${cardId}:${cocktailKey}:wells`;

export const cocktailAntibodiesId = (cardId: string, cocktailKey: string): string =>
  `${cardId}:${cocktailKey}:antibodies`;

function cardNames(
  card: FlowCytometryPanelCard,
  materialNames: ReadonlyMap<string, string>,
  wells: ReadonlyMap<string, number>,
  taken: Set<string>,
  ownNames: ReadonlyMap<string, BoardName>
): BoardName[] {
  const claim = (name: string) => {
    const isFree = !taken.has(nameKey(name));
    taken.add(nameKey(name));
    return isFree;
  };
  const factorNames = new Map<string, string>();
  const factors = card.rows.flatMap((row): BoardName[] => {
    const material = materialNames.get(row.materialId);
    if (!material) return [];
    const name = dilutionFactorName(material);
    if (!claim(name)) return [];
    factorNames.set(row.id, name);
    return [
      {
        kind: 'value',
        id: `${row.id}:dilution`,
        name,
        value: row.dilution,
        unit: RATIO_NOTATION,
        originCardId: card.id,
      },
    ];
  });

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
      const shares = cocktail.rows.flatMap(row => factorNames.get(row.id) ?? []);
      if (!shares.length) return count;
      const antibodiesName = `${cocktail.name} antibodies`;
      if (!claim(antibodiesName)) return count;
      return [
        ...count,
        {
          kind: 'calculation',
          id: cocktailAntibodiesId(card.id, cocktail.key),
          name: antibodiesName,
          expr: shares.join(' + '),
          unit: SHARE_UNIT,
          workedOut: group,
          originCardId: card.id,
        },
      ];
    })
  );
  const amounts = card.rows.flatMap((row): BoardName[] => {
    const material = materialNames.get(row.materialId);
    const factor = factorNames.get(row.id);
    if (!material || !factor) return [];
    const name = `${material} amount per well`;
    if (!claim(name)) return [];
    const staining = row.stain.trim();
    const volume = findTerm(ownNames, COCKTAIL_VOLUME_PER_WELL, [staining, ''])?.name.trim();
    const problem = !staining
      ? 'Needs a staining, e.g. Surface'
      : !volume
        ? `Needs "${joinValueName(staining, COCKTAIL_VOLUME_PER_WELL.word)}" or "${COCKTAIL_VOLUME_PER_WELL.word}" in Values`
        : undefined;
    return [
      {
        kind: 'calculation',
        id: stainAmountId(row.id),
        name,
        expr: volume ? `${volume} × ${factor}` : '',
        unit: PIPETTED_UNIT,
        workedOut: {
          key: `amount:${row.id}`,
          subject: material,
          title: 'Amount per well',
          settingsCardId: card.id,
        },
        originCardId: card.id,
        ...(problem && { problem }),
      },
    ];
  });
  return [...factors, ...cocktails, ...amounts];
}

export function flowCytometryCalculationNames(
  protocol: Protocol,
  taken: readonly BoardName[]
): BoardName[] {
  const materialNames = new Map(
    protocol.blocks
      .flatMap(card => (card.type === 'materials' ? card.items : []))
      .filter(item => item.name.trim() && !item.isDropped)
      .map(item => [item.id, item.name.trim()])
  );
  const wells = stainedWellCounts(
    protocol.blocks.filter((card): card is PlateMapCard => card.type === 'plate')
  );
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const ownNames = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  return protocol.blocks.flatMap(card =>
    card.type === 'cytometer' ? cardNames(card, materialNames, wells, takenKeys, ownNames) : []
  );
}
