import { UNIT_REGISTRY, type Protocol } from '@odysseus/shared-schemas';

import {
  kindIndex,
  nameKey,
  type BoardKind,
  type KindIndex,
  type SolvedBoard,
  type BoardName,
  type CalculationName,
  type CalculationGap,
  type CalculationResult,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import { formatNumber } from '../formulas/quantities';
import {
  CELLS_PER_VIAL,
  CELLS_PER_WELL,
  EXTRA,
  LIVE_CELL_CONCENTRATION,
  LIVE_CELLS,
  PLATING_CONCENTRATION,
  STOCK_CONCENTRATION,
  TOTAL_CELL_CONCENTRATION,
  TOTAL_NEEDED,
  VIABILITY,
  VOLUME,
  VOLUME_PER_WELL,
  WELLS,
  perLabwareKind,
  type SampleNoun,
  type Term,
} from '../terms/termList';
import { findTerm, findTermOn } from '../terms/termLookup';
import { GENERAL, joinValueName, lowerLead } from '../values/valueNames';

import { cellPartId, CELLS_TO_PREPARE } from './cellCounts';
import { donorListName } from './materialDonors';
import { nameWithoutNotes } from './materialLookup';
import { platedCells, type CellPlacement, type PlatedCells } from './platedCells';

const isCellConcentration = (unit: string) =>
  UNIT_REGISTRY.some(entry => entry.id === unit && entry.kind === 'count-conc');
const CELLS = 'cells';
const CELLS_PER_ML = 'cells/mL';
const PER_VIAL_FIELD = 'cells-per-vial';
const VOLUME_TO_TAKE = 'Vol. to take';

const isFilled = (entry: BoardName | undefined): entry is BoardName =>
  !!entry && (entry.kind !== 'value' || !!entry.value.trim());

const missingCount = (count: Term, ...others: Term[]): CalculationGap => ({
  problem: `Needs a live count: ${count.word}, or ${others.map(term => term.word).join(' and ')}`,
});

function subjectNames(
  plated: PlatedCells,
  names: ReadonlyMap<string, BoardName>,
  kinds: KindIndex
): BoardName[] {
  const { subject, material, donor, placements } = plated;
  const donorList = donorListName(material);
  const materialName = nameWithoutNotes(material.name);
  const subjectId = (donor ?? material).id;
  const materialOwners = [material.id];
  const owners = [subjectId];
  const kindFor = (term: Term, noun?: SampleNoun): BoardKind => ({
    term: term.key,
    noun,
    owner: subjectId,
  });
  const isSplit = placements.length > 1;
  const id = (part: string) => cellPartId(plated, part);
  const filled = (term: Term) => {
    const entry = findTerm(kinds, term, owners);
    return isFilled(entry) ? entry.name : undefined;
  };
  const group: WorkedOutGroup = {
    key: id('group'),
    subject,
    title: CELLS_TO_PREPARE,
    settings: { type: 'materials' },
  };
  const inputs: BoardName[] = [];
  const calculations: CalculationName[] = [];
  const input = (part: string, name: string, value: string, unit: string, kindOf?: BoardKind) => {
    inputs.push({
      kind: 'value',
      id: id(part),
      name,
      value,
      unit,
      workedOut: group,
      ...(kindOf && { kindOf }),
    });
    return name;
  };
  const addCalculation = (
    part: string,
    name: string,
    expr: string,
    unit: string,
    gap?: CalculationGap,
    kindOf?: BoardKind
  ) =>
    calculations.push({
      kind: 'calculation',
      id: id(part),
      name,
      formula: expr,
      unit,
      workedOut: group,
      ...gap,
      ...(kindOf && { kindOf }),
    });

  const extra = findTerm(kinds, EXTRA, [...owners, ...materialOwners, GENERAL])?.name;
  const prepFor = ({ noun, wells, cells, perWell: perWellCounts }: CellPlacement) => {
    const word = (term: Term) => perLabwareKind(term, noun).word;
    const find = (term: Term, from: readonly string[]) =>
      (isSplit ? findTermOn(kinds, term, from, noun) : findTerm(kinds, term, from, noun))?.name;
    const plural = lowerLead(word(WELLS));
    const forThem = isSplit ? ` for the ${plural}` : '';
    const part = (name: string) => (isSplit ? `${name}:${noun}` : name);

    const wellsName = `${subject} ${plural}`;
    if (!names.has(nameKey(wellsName))) {
      inputs.push({
        kind: 'count',
        id: id(part('wells')),
        name: wellsName,
        count: wells,
        workedOut: group,
        kindOf: kindFor(WELLS, noun),
      });
    }
    const placed =
      noun === 'well' ? 'on the plate' : `in ${noun === 'sample' ? 'all' : 'the'} ${plural}`;
    const onPlate = input(part('plated'), `${subject} cells ${placed}`, String(cells), CELLS);
    const [onlyPerWell] = perWellCounts;
    const perWell =
      perWellCounts.size === 1
        ? (find(CELLS_PER_WELL, owners) ??
          input(
            part('per-well'),
            joinValueName(subject, word(CELLS_PER_WELL)),
            String(onlyPerWell),
            CELLS,
            kindFor(CELLS_PER_WELL, noun)
          ))
        : undefined;
    const volume = find(VOLUME_PER_WELL, [...owners, ...materialOwners]);

    const needed = `${joinValueName(subject, TOTAL_NEEDED.word)}${forThem}`;
    addCalculation(
      part('needed'),
      needed,
      extra ? `${onPlate} × (1 + ${extra})` : onPlate,
      CELLS,
      undefined,
      isSplit ? undefined : kindFor(TOTAL_NEEDED)
    );
    const plating = `${joinValueName(subject, PLATING_CONCENTRATION.word)}${forThem}`;
    const platingProblem: CalculationGap | undefined = !perWell
      ? { problem: `${word(CELLS_PER_WELL)} differ between ${plural}` }
      : !volume
        ? {
            problem: `Needs "${word(VOLUME_PER_WELL)}" in Values, the volume of cells added to each ${noun}`,
            need: joinValueName(materialName, word(VOLUME_PER_WELL)),
          }
        : undefined;
    addCalculation(
      part('plating'),
      plating,
      platingProblem ? '' : `${perWell} ÷ ${volume}`,
      CELLS_PER_ML,
      platingProblem,
      isSplit ? undefined : kindFor(PLATING_CONCENTRATION)
    );
    return { forThem, part, needed, plating, platingProblem };
  };
  const preps = placements.map(prepFor);

  const needed = isSplit ? joinValueName(subject, TOTAL_NEEDED.word) : preps[0].needed;
  if (isSplit) {
    addCalculation(
      'needed',
      needed,
      preps.map(prep => prep.needed).join(' + '),
      CELLS,
      undefined,
      kindFor(TOTAL_NEEDED)
    );
  }
  const perVialValue = donor?.values[PER_VIAL_FIELD]?.trim();
  const perVial =
    findTerm(kinds, CELLS_PER_VIAL, owners)?.name ??
    (perVialValue
      ? input('per-vial', `${subject} cells per vial`, perVialValue, CELLS, kindFor(CELLS_PER_VIAL))
      : undefined);
  const liveCells = filled(LIVE_CELLS);
  const liveConcentration = filled(LIVE_CELL_CONCENTRATION);
  const stockEntry = donor ? undefined : findTerm(kinds, STOCK_CONCENTRATION, owners);
  const stock =
    liveConcentration ??
    (stockEntry?.kind === 'value' && stockEntry.value.trim() && isCellConcentration(stockEntry.unit)
      ? stockEntry.name
      : undefined);

  const isResuspended = !!donor || !!perVial || (!stock && !!liveCells);
  if (!isResuspended) {
    const missingStock = stock
      ? undefined
      : missingCount(LIVE_CELL_CONCENTRATION, TOTAL_CELL_CONCENTRATION, VIABILITY);
    for (const prep of preps) {
      const suspension = `${subject} suspension to make${prep.forThem}`;
      const stockToTake = `${subject} stock to take${prep.forThem}`;
      addCalculation(
        prep.part('suspension'),
        suspension,
        prep.platingProblem ? '' : `${prep.needed} ÷ ${prep.plating}`,
        '',
        prep.platingProblem
      );
      addCalculation(
        prep.part('stock'),
        stockToTake,
        stock ? `${prep.needed} ÷ ${stock}` : '',
        '',
        missingStock
      );
      addCalculation(
        prep.part('diluent'),
        `${subject} diluent to add${prep.forThem}`,
        stock && !prep.platingProblem ? `${suspension} − ${stockToTake}` : '',
        '',
        missingStock ?? prep.platingProblem
      );
    }
  } else {
    if (donor !== undefined || perVial !== undefined) {
      addCalculation(
        'vials',
        `${subject} vials to thaw`,
        perVial ? `round up(${needed} ÷ ${perVial})` : '',
        '',
        perVial ? undefined : { problem: `Needs cells per vial in ${donorList}` }
      );
    }
    if (!isSplit) {
      const [{ plating, platingProblem }] = preps;
      addCalculation(
        'resuspend',
        `${subject} resuspend volume`,
        liveCells && !platingProblem ? `${liveCells} ÷ ${plating}` : '',
        '',
        liveCells ? platingProblem : missingCount(LIVE_CELLS, LIVE_CELL_CONCENTRATION, VOLUME)
      );
    }
    for (const prep of isSplit ? preps : []) {
      addCalculation(
        prep.part('take'),
        `${joinValueName(subject, VOLUME_TO_TAKE)}${prep.forThem}`,
        liveConcentration ? `${prep.needed} ÷ ${liveConcentration}` : '',
        '',
        liveConcentration ? undefined : missingCount(LIVE_CELL_CONCENTRATION, LIVE_CELLS, VOLUME)
      );
      addCalculation(
        prep.part('resuspend'),
        `${subject} resuspend volume${prep.forThem}`,
        prep.platingProblem ? '' : `${prep.needed} ÷ ${prep.plating}`,
        '',
        prep.platingProblem
      );
    }
  }
  if (isResuspended || liveCells) {
    addCalculation(
      'left-over',
      `${subject} cells left over`,
      liveCells ? `${liveCells} − ${needed}` : '',
      CELLS,
      liveCells ? undefined : missingCount(LIVE_CELLS, LIVE_CELL_CONCENTRATION, VOLUME)
    );
  }

  const takenName = calculations.map(entry => entry.name).find(name => names.has(nameKey(name)));
  if (!takenName) return [...inputs, ...calculations];
  const problem = `Rename "${takenName}": the cell math for ${subject} needs that name.`;
  return calculations
    .filter(entry => !names.has(nameKey(entry.name)))
    .map(({ need: _need, ...entry }) => ({ ...entry, problem }));
}

export function cellCalculationNames(
  protocol: Protocol,
  taken: readonly BoardName[],
  board: SolvedBoard
): BoardName[] {
  const names = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  const kinds = kindIndex(taken, false);
  return platedCells(protocol, board).flatMap(plated => subjectNames(plated, names, kinds));
}

function shortfallOf(result: CalculationResult | undefined): string | undefined {
  if (result?.status !== 'ok') return undefined;
  const short = -result.quantity.magnitude;
  return short > 0 ? `Short by ${formatNumber(short)} cells` : undefined;
}

export function cellWarnings(board: SolvedBoard): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  for (const [id, result] of board.results) {
    if (!id.startsWith('cells:') || !id.endsWith(':left-over')) continue;
    const shortfall = shortfallOf(result);
    if (shortfall) warnings.set(id, [shortfall]);
  }
  return warnings;
}
