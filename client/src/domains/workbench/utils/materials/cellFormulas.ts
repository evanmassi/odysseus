import {
  lineValueOf,
  type MaterialItem,
  type MaterialSource,
  type Protocol,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import {
  calculateBoard,
  nameKey,
  type BoardCalculation,
  type BoardName,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import { formatNumber } from '../formulas/quantities';
import { joinValueName } from '../values/valueNames';
import { cellCount } from '../vessels/cellRatios';

import { findMaterial, listedMaterials, nameWithoutNotes } from './materialLookup';
import { findSource, sourcesIn, workedOutCount } from './materialSources';

const NO_NAMES = calculateBoard([]);
const CELLS = 'cells';
const CELLS_PER_ML = 'cells/mL';
const LIVE_FIELD = 'live-count';
const PER_VIAL_FIELD = 'cells-per-vial';

interface PlatedCells {
  subject: string;
  material: MaterialItem;
  source: MaterialSource | undefined;
  wells: number;
  cells: number;
  perWell: Set<number>;
}

function platedCells(protocol: Protocol): PlatedCells[] {
  const materials = listedMaterials(protocol).filter(item => !item.isDropped);
  const sources = sourcesIn({ blocks: protocol.blocks });
  const plated = new Map<string, PlatedCells>();
  const plates = protocol.blocks.filter((block): block is VesselMapBlock => block.type === 'plate');
  for (const plate of plates) {
    for (const [key, lines] of Object.entries(plate.cells)) {
      for (const line of plate.lines) {
        const text = lineValueOf(line, lines[line.id])?.text.trim();
        const count = text ? cellCount(plate, key, line, NO_NAMES) : undefined;
        if (!text || count === undefined) continue;
        const donor = findSource(sources, text);
        const material = donor?.material ?? findMaterial(materials, text);
        if (!material) continue;
        const subject = donor ? donor.source.name.trim() : nameWithoutNotes(material.name);
        const entry = plated.get(nameKey(subject)) ?? {
          subject,
          material,
          source: donor?.source,
          wells: 0,
          cells: 0,
          perWell: new Set<number>(),
        };
        entry.wells += 1;
        entry.cells += count;
        entry.perWell.add(count);
        plated.set(nameKey(subject), entry);
      }
    }
  }
  return [...plated.values()];
}

function sourceCount(source: MaterialSource | undefined, key: string): string | undefined {
  if (!source) return undefined;
  const typed = source.values[key]?.trim();
  if (typed) return typed;
  const worked = workedOutCount(source);
  return worked?.key === key ? worked.value : undefined;
}

function subjectNames(
  plated: PlatedCells,
  names: ReadonlyMap<string, BoardName>,
  materialsBlockId: string | undefined
): BoardName[] {
  const { subject, material, source } = plated;
  const owner = nameWithoutNotes(material.name);
  const id = (part: string) => `cells:${nameKey(subject)}:${part}`;
  const own = (label: string) => names.get(nameKey(joinValueName(subject, label)))?.name;
  const ownOrMaterial = (label: string) =>
    own(label) ?? names.get(nameKey(joinValueName(owner, label)))?.name;
  const group: WorkedOutGroup = {
    key: id('group'),
    subject,
    title: 'Cells to prepare',
    settingsBlockId: materialsBlockId,
  };
  const inputs: BoardName[] = [];
  const formulas: Array<Extract<BoardName, { kind: 'formula' }>> = [];
  const input = (part: string, name: string, value: string, unit: string) => {
    inputs.push({ kind: 'value', id: id(part), name, value, unit, workedOut: group });
    return name;
  };
  const formula = (part: string, name: string, expr: string, unit: string, problem?: string) =>
    formulas.push({
      kind: 'formula',
      id: id(part),
      name,
      expr,
      unit,
      workedOut: group,
      ...(problem && { problem }),
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
      ? (own('per well') ??
        input('per-well', `${subject} cells per well`, String(onlyPerWell), CELLS))
      : undefined;
  const perVialValue = sourceCount(source, PER_VIAL_FIELD);
  const perVial =
    own('cells per vial') ??
    (perVialValue
      ? input('per-vial', `${subject} cells per vial`, perVialValue, CELLS)
      : undefined);
  const liveValue = sourceCount(source, LIVE_FIELD);
  const live =
    own('live count') ??
    (liveValue ? input('live', `${subject} live count`, liveValue, CELLS) : undefined);
  const extra = ownOrMaterial('extra');
  const volume = ownOrMaterial('volume per well');

  const needed = `${subject} cells needed`;
  formula('needed', needed, extra ? `${onPlate} × (1 + ${extra})` : onPlate, CELLS);
  if (source !== undefined || perVial !== undefined) {
    formula(
      'vials',
      `${subject} vials to thaw`,
      perVial ? `round up(${needed} ÷ ${perVial})` : '',
      '',
      perVial ? undefined : `Needs ${subject} cells per vial in Materials`
    );
  }
  const plating = `${subject} plating concentration`;
  formula(
    'plating',
    plating,
    perWell && volume ? `${perWell} ÷ ${volume}` : '',
    CELLS_PER_ML,
    !perWell
      ? `${subject} cells per well differ between wells`
      : !volume
        ? `Needs ${joinValueName(owner, 'volume per well')}, the volume of cells added to each well`
        : undefined
  );
  const missingLive = live ? undefined : `Needs ${subject} live count`;
  formula(
    'resuspend',
    `${subject} resuspend volume`,
    live && perWell && volume ? `${live} ÷ ${plating}` : '',
    '',
    missingLive ?? (perWell && volume ? undefined : `Needs ${plating}`)
  );
  formula(
    'left-over',
    `${subject} cells left over`,
    live ? `${live} − ${needed}` : '',
    CELLS,
    missingLive
  );

  const clash = formulas.map(entry => entry.name).find(name => names.has(nameKey(name)));
  if (!clash) return [...inputs, ...formulas];
  const problem = `Rename “${clash}”: the cell math for ${subject} needs that name.`;
  return formulas
    .filter(entry => !names.has(nameKey(entry.name)))
    .map(entry => ({ ...entry, problem }));
}

export function cellFormulaNames(protocol: Protocol, taken: readonly BoardName[]): BoardName[] {
  const names = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  const materialsBlockId = protocol.blocks.find(block => block.type === 'materials')?.id;
  return platedCells(protocol).flatMap(plated => subjectNames(plated, names, materialsBlockId));
}

export function cellWarnings(calculation: BoardCalculation): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  for (const [id, result] of calculation.results) {
    if (!id.startsWith('cells:') || !id.endsWith(':left-over') || result.status !== 'ok') continue;
    const short = -result.quantity.magnitude;
    if (short > 0) warnings.set(id, [`Short by ${formatNumber(short)} cells`]);
  }
  return warnings;
}
