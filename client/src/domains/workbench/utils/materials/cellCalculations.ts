import { UNIT_REGISTRY, type Protocol } from '@odysseus/shared-schemas';

import {
  nameKey,
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
  type Term,
} from '../terms/termList';
import { findTerm } from '../terms/termLookup';
import { joinValueName } from '../values/valueNames';

import { cellPartId, CELLS_TO_PREPARE } from './cellCounts';
import { donorListName } from './materialDonors';
import { nameWithoutNotes } from './materialLookup';
import { platedCells, type PlatedCells } from './platedCells';

const isCellConcentration = (unit: string) =>
  UNIT_REGISTRY.some(entry => entry.id === unit && entry.kind === 'count-conc');
const CELLS = 'cells';
const CELLS_PER_ML = 'cells/mL';
const PER_VIAL_FIELD = 'cells-per-vial';

const isFilled = (entry: BoardName | undefined): entry is BoardName =>
  !!entry && (entry.kind !== 'value' || !!entry.value.trim());

const missingCount = (count: Term, ...others: Term[]): CalculationGap => ({
  problem: `Needs a live count: ${count.word}, or ${others.map(term => term.word).join(' and ')}`,
});

function subjectNames(
  plated: PlatedCells,
  names: ReadonlyMap<string, BoardName>,
  materialsCardId: string | undefined
): BoardName[] {
  const { subject, material, donor } = plated;
  const donorList = donorListName(material);
  const materialOwners = [material.name.trim(), nameWithoutNotes(material.name)];
  const owners = donor ? [subject] : [subject, ...materialOwners];
  const id = (part: string) => cellPartId(subject, part);
  const named = (term: Term, from: readonly string[]) => findTerm(names, term, from)?.name;
  const filled = (term: Term) => {
    const entry = findTerm(names, term, owners);
    return isFilled(entry) ? entry.name : undefined;
  };
  const group: WorkedOutGroup = {
    key: id('group'),
    subject,
    title: CELLS_TO_PREPARE,
    settingsCardId: materialsCardId,
  };
  const inputs: BoardName[] = [];
  const calculations: CalculationName[] = [];
  const input = (part: string, name: string, value: string, unit: string) => {
    inputs.push({ kind: 'value', id: id(part), name, value, unit, workedOut: group });
    return name;
  };
  const addCalculation = (
    part: string,
    name: string,
    expr: string,
    unit: string,
    gap?: CalculationGap
  ) =>
    calculations.push({
      kind: 'calculation',
      id: id(part),
      name,
      formula: expr,
      unit,
      workedOut: group,
      ...gap,
    });

  const wellsName = `${subject} wells`;
  if (!names.has(nameKey(wellsName))) {
    inputs.push({
      kind: 'count',
      id: id('wells'),
      name: wellsName,
      count: plated.wells,
      workedOut: group,
    });
  }
  const onPlate = input('plated', `${subject} cells on the plate`, String(plated.cells), CELLS);
  const [onlyPerWell] = plated.perWell;
  const perWell =
    plated.perWell.size === 1
      ? (named(CELLS_PER_WELL, [subject]) ??
        input('per-well', joinValueName(subject, CELLS_PER_WELL.word), String(onlyPerWell), CELLS))
      : undefined;
  const perVialValue = donor?.values[PER_VIAL_FIELD]?.trim();
  const perVial =
    named(CELLS_PER_VIAL, [subject]) ??
    (perVialValue
      ? input('per-vial', `${subject} cells per vial`, perVialValue, CELLS)
      : undefined);
  const liveCells = filled(LIVE_CELLS);
  const stockEntry = donor ? undefined : findTerm(names, STOCK_CONCENTRATION, owners);
  const stock =
    filled(LIVE_CELL_CONCENTRATION) ??
    (stockEntry?.kind === 'value' && stockEntry.value.trim() && isCellConcentration(stockEntry.unit)
      ? stockEntry.name
      : undefined);
  const extra = named(EXTRA, [...owners, ...materialOwners, '']);
  const volume = named(VOLUME_PER_WELL, [...owners, ...materialOwners]);

  const needed = joinValueName(subject, TOTAL_NEEDED.word);
  addCalculation('needed', needed, extra ? `${onPlate} × (1 + ${extra})` : onPlate, CELLS);
  const plating = joinValueName(subject, PLATING_CONCENTRATION.word);
  const platingProblem: CalculationGap | undefined = !perWell
    ? { problem: `${CELLS_PER_WELL.word} differ between wells` }
    : !volume
      ? {
          problem: `Needs "${VOLUME_PER_WELL.word}" in Values, the volume of cells added to each well`,
          need: joinValueName(nameWithoutNotes(material.name), VOLUME_PER_WELL.word),
        }
      : undefined;
  addCalculation(
    'plating',
    plating,
    platingProblem ? '' : `${perWell} ÷ ${volume}`,
    CELLS_PER_ML,
    platingProblem
  );

  const isResuspended = !!donor || !!perVial || (!stock && !!liveCells);
  if (!isResuspended) {
    const suspension = `${subject} suspension to make`;
    const stockToTake = `${subject} stock to take`;
    const missingStock = stock
      ? undefined
      : missingCount(LIVE_CELL_CONCENTRATION, TOTAL_CELL_CONCENTRATION, VIABILITY);
    addCalculation(
      'suspension',
      suspension,
      platingProblem ? '' : `${needed} ÷ ${plating}`,
      '',
      platingProblem
    );
    addCalculation('stock', stockToTake, stock ? `${needed} ÷ ${stock}` : '', '', missingStock);
    addCalculation(
      'diluent',
      `${subject} diluent to add`,
      stock && !platingProblem ? `${suspension} − ${stockToTake}` : '',
      '',
      missingStock ?? platingProblem
    );
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
    addCalculation(
      'resuspend',
      `${subject} resuspend volume`,
      liveCells && !platingProblem ? `${liveCells} ÷ ${plating}` : '',
      '',
      liveCells ? platingProblem : missingCount(LIVE_CELLS, LIVE_CELL_CONCENTRATION, VOLUME)
    );
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

export function cellCalculationNames(protocol: Protocol, taken: readonly BoardName[]): BoardName[] {
  const names = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  const materialsCardId = protocol.cards.find(card => card.type === 'materials')?.id;
  return platedCells(protocol).flatMap(plated => subjectNames(plated, names, materialsCardId));
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
