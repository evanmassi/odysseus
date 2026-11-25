import {
  type MaterialItem,
  type Protocol,
  type ValuesCard,
  type ValueRow,
  type PlateMapCard,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import { STOCK_FIELD } from '../dilutions/dilutionStock';
import {
  calculationAnswerText,
  type BoardName,
  type SolvedBoard,
  type CalculationResult,
} from '../formulas/boardCalculation';
import { FOLD_UNIT } from '../formulas/quantities';
import { workingText } from '../formulas/workingTree';
import {
  cellPartId,
  CELL_COUNTS,
  CELLS_TO_PREPARE,
  countId,
  countName,
  countNumberText,
  countSubjects,
  countValues,
  countWorking,
  solveCounts,
  type CountSubject,
} from '../materials/cellCounts';
import {
  CELL_COUNT_FIELDS,
  CELL_COUNT_KEYS,
  MATERIAL_GROUPS,
  type CellCount,
  fieldLabel,
  fieldUnit,
  materialGroup,
  UNIT_PER_ITEM,
} from '../materials/materialCatalog';
import { findDonor, donorsIn } from '../materials/materialDonors';
import { UNSORTED_GROUP } from '../materials/materialItems';
import {
  displayNameOf,
  findMaterial,
  findNamed,
  nameWithoutNotes,
} from '../materials/materialLookup';
import {
  finalConcentrationName,
  mixConcentrationName,
  mixFinalId,
  recipeFinalId,
  recipePlacements,
  type RecipePlacement,
} from '../materials/materialRecipeCalculations';
import { labwareTitle } from '../plateMap/plateMapTabs';
import { plateSwatches, type PlateSwatch } from '../plateMap/plateSwatches';
import {
  MIX_CONCENTRATION,
  TOTAL_WELL_VOLUME,
  perLabwareKind,
  SAMPLE_NOUNS,
  VOLUME_PER_WELL,
  WELLS,
  type SampleNoun,
} from '../terms/termList';
import {
  findTerm,
  findTermOn,
  isSpellingOf,
  perSampleNounOf,
  sampleNounsOf,
} from '../terms/termLookup';

import { canRemovePlateRow, plateValueRows, type PlateValueRow } from './plateValueRows';
import { linkedValueOf, valueRowName } from './valueEdits';
import { assaySetupTitleOf, columnKey, joinValueName, lowerLead } from './valueNames';

import type { ValueNeed } from './valueNeeds';
import type { RoutedValue } from './valueRouting';

export type ValueOrigin = 'typed' | 'plate' | 'materials' | 'worked';

export type ValueCellLink =
  | { kind: 'item'; itemId: string }
  | { kind: 'plate'; row: PlateValueRow }
  | { kind: 'wells' }
  | { kind: 'recipe'; materialId: string; entryId: string }
  | { kind: 'need'; routed: RoutedValue }
  | { kind: 'count'; materialId: string; donorId: string | undefined; count: CellCount }
  | { kind: 'worked' };

export interface ValueCell {
  id: string;
  nameId: string;
  columnKey: string;
  label: string;
  fullName: string;
  value: string;
  unit: string;
  units: readonly string[] | undefined;
  isEditable: boolean;
  canRemove: boolean;
  note: string;
  neededFor: readonly string[];
  origin: ValueOrigin;
  linkedTo: ValueCellLink;
  workedValue?: string;
  isMismatched?: boolean;
}

export type ValueRowStatus = 'current' | 'setAside' | 'removed';

export type ValueRowRail =
  | { place: 'none' }
  | { place: 'start' | 'middle' | 'end'; color: string | undefined };

export interface ValueTableRow {
  id: string;
  name: string;
  shownName: string;
  valueRow: ValueRow | undefined;
  material: MaterialItem | undefined;
  status: ValueRowStatus;
  swatch: PlateSwatch | undefined;
  isSubRow: boolean;
  rail: ValueRowRail;
  cells: ValueCell[];
}

export interface ValueTableColumn {
  key: string;
  label: string;
  origin: ValueOrigin;
}

export interface ValueTableGroup {
  key: string;
  label: string;
  columns: ValueTableColumn[];
  rows: ValueTableRow[];
}

export interface ValueTableSources {
  materials: ReadonlyMap<string, MaterialItem>;
  board: SolvedBoard;
  needs: readonly ValueNeed[];
  unsortedNames: readonly string[];
}

interface RowDraft extends ValueTableRow {
  groupKey: string;
  subRows: Map<string, ValueTableRow>;
}

const MIX_GROUP = { key: 'mix', label: 'Mixes' };
const PLATE_GROUP_KEY = 'supplies';
const ORIGIN_RANK: Record<ValueOrigin, number> = { typed: 0, plate: 1, materials: 2, worked: 3 };
const NOT_NEEDED: readonly string[] = [];
const COUNT_RANK = -1;
const SHOWN_COUNTS: readonly CellCount[] = CELL_COUNTS.filter(count => count !== 'totalCells');

function missingCount(
  subject: CountSubject,
  board: SolvedBoard,
  isKnown: (count: CellCount) => boolean
): CellCount | undefined {
  const failed = (part: string) => board.results.get(cellPartId(subject, part))?.status === 'error';
  if (failed('stock') && !isKnown('liveConcentration')) return 'liveConcentration';
  if (failed('resuspend') && !isKnown('liveCells')) return 'liveCells';
  return undefined;
}

const countLabel = (noun: SampleNoun) => perLabwareKind(WELLS, noun).word;
const SAMPLES_COLUMN = columnKey(countLabel('sample'));
const wellVolumeOnARow = (assaySetupTitle: string) =>
  `Not used: the math reads ${TOTAL_WELL_VOLUME.word} from ${assaySetupTitle}, the same for every well`;

const wellsCell = (entry: Extract<BoardName, { kind: 'count' }>, noun: SampleNoun): ValueCell => ({
  id: entry.id,
  nameId: entry.id,
  columnKey: columnKey(countLabel(noun)),
  label: countLabel(noun),
  fullName: entry.name,
  value: String(entry.count),
  unit: '',
  units: [],
  isEditable: false,
  canRemove: false,
  note: '',
  neededFor: NOT_NEEDED,
  origin: 'plate',
  linkedTo: { kind: 'wells' },
});

function inheritedVolumeCells(subject: CountSubject, board: SolvedBoard): ValueCell[] {
  const nouns = sampleNounsOf(board.names, [subject.subject]);
  return nouns.flatMap(noun => inheritedVolumeCell(subject, board, noun, nouns.length > 1));
}

function inheritedVolumeCell(
  subject: CountSubject,
  board: SolvedBoard,
  noun: SampleNoun,
  isSplit: boolean
): ValueCell[] {
  const { material } = subject;
  const owners = [material.name.trim(), nameWithoutNotes(material.name)];
  const volume = isSplit
    ? findTermOn(board.names, VOLUME_PER_WELL, owners, noun)
    : findTerm(board.names, VOLUME_PER_WELL, owners, noun);
  if (!subject.isPlated || volume?.kind !== 'value' || !volume.value.trim()) return [];
  const label = perLabwareKind(VOLUME_PER_WELL, noun).word;
  const id = `${cellPartId(subject, 'inherited')}:${label}`;
  return [
    {
      id,
      nameId: volume.id,
      columnKey: columnKey(label),
      label,
      fullName: volume.name,
      value: '',
      workedValue: volume.value,
      unit: volume.unit,
      units: [],
      isEditable: false,
      canRemove: false,
      note: `Set on the ${material.name.trim()} row`,
      neededFor: NOT_NEEDED,
      origin: 'worked',
      linkedTo: { kind: 'worked' },
    },
  ];
}

function countCells(subject: CountSubject, board: SolvedBoard): ValueCell[] {
  const values = countValues(subject);
  const solved = solveCounts(values);
  const isKnown = (count: CellCount) => solved.readings.has(count);
  const missing = subject.isPlated ? missingCount(subject, board, isKnown) : undefined;
  const needer = [`${CELLS_TO_PREPARE} for ${subject.subject}`];
  const shown = CELL_COUNTS.filter(
    count => SHOWN_COUNTS.includes(count) || solved.readings.get(count)?.isTyped
  );
  return shown.map((count): ValueCell => {
    const field = CELL_COUNT_FIELDS[count];
    const reading = solved.readings.get(count);
    const mismatch = solved.mismatches.get(count);
    const worked = reading && !reading.isTyped ? reading : undefined;
    const id = countId(subject, count);
    return {
      id,
      nameId: id,
      columnKey: columnKey(field.label),
      label: field.label,
      fullName: countName(subject, count),
      value: values[field.key] ?? '',
      unit: field.unit,
      units: [],
      isEditable: true,
      canRemove: false,
      note: mismatch ?? (worked ? `Worked out: ${countWorking(solved, count)}` : ''),
      neededFor: count === missing ? needer : NOT_NEEDED,
      origin: 'materials',
      linkedTo: {
        kind: 'count',
        materialId: subject.material.id,
        donorId: subject.donor?.id,
        count,
      },
      ...(worked && { workedValue: countNumberText(count, worked.value) }),
      ...(mismatch && { isMismatched: true }),
    };
  });
}

const isPlateMap = (card: Protocol['cards'][number]): card is PlateMapCard =>
  card.type === 'plateMap';

function plateMaterialFor(
  plateMap: PlateMapCard,
  plates: readonly PlateMapCard[],
  materials: readonly MaterialItem[]
): MaterialItem | undefined {
  return materials.find(material => {
    if (material.type !== 'Plate') return false;
    const key = normalizeMaterialKey(material.name);
    const matched =
      plates.find(candidate => key && normalizeMaterialKey(candidate.title).includes(key)) ??
      (plates.length === 1 ? plates[0] : undefined);
    return matched === plateMap;
  });
}

function plateSubject(row: PlateValueRow): { subject: string; variant: string; label: string } {
  const { source } = row;
  return source.kind === 'count'
    ? { subject: source.count.subject, variant: '', label: source.count.label }
    : {
        subject: source.amount.subject,
        variant: source.amount.variant,
        label: source.amount.label,
      };
}

function plateCellFields(row: PlateValueRow, cardTitle: string) {
  const canRemove = canRemovePlateRow(row);
  const { source } = row;
  if (source.kind === 'count') {
    const { count } = source;
    return {
      value: String(count.count),
      unit: '',
      units: [],
      isEditable: count.kind !== 'total',
      canRemove,
      note: count.count === count.tally ? '' : `Typed in; ${cardTitle} counts ${count.tally}`,
    };
  }
  const from = source.amount.source;
  const isFixedUnit =
    from.kind === 'points' || (from.kind === 'series' && from.field === 'dilutionFactor');
  return {
    value: source.amount.value,
    unit: source.amount.unit,
    units: isFixedUnit ? [] : undefined,
    isEditable: from.kind !== 'points',
    canRemove,
    note: '',
  };
}

function workedCell(
  id: string,
  fullName: string,
  result: CalculationResult | undefined,
  { label, wellTotal }: RecipePlacement
): ValueCell {
  const isReady = result?.status === 'ok';
  const working = isReady ? workingText(result.working) : '';
  return {
    id,
    nameId: id,
    columnKey: columnKey(label),
    label,
    fullName,
    value: isReady ? calculationAnswerText(result) : '',
    unit: '',
    units: [],
    isEditable: false,
    canRemove: false,
    note: isReady
      ? `Worked out: ${working}${wellTotal ? ` (${wellTotal})` : ''}`
      : (result?.message ?? ''),
    neededFor: NOT_NEEDED,
    origin: 'worked',
    linkedTo: { kind: 'worked' },
  };
}

function orderColumns(rows: readonly ValueTableRow[]): ValueTableColumn[] {
  const columns = new Map<
    string,
    { label: string; origins: Set<ValueOrigin>; isCount: boolean; at: number }
  >();
  for (const cell of rows.flatMap(row => row.cells)) {
    const column = columns.get(cell.columnKey) ?? {
      label: cell.label,
      origins: new Set<ValueOrigin>(),
      isCount: false,
      at: columns.size,
    };
    column.origins.add(cell.origin);
    if (cell.linkedTo.kind === 'count') column.isCount = true;
    columns.set(cell.columnKey, column);
  }
  return [...columns]
    .map(([key, { label, origins, isCount, at }]) => {
      const rank = isCount
        ? COUNT_RANK
        : Math.min(...[...origins].map(origin => ORIGIN_RANK[origin]));
      const origin: ValueOrigin = origins.size === 1 ? [...origins][0] : 'typed';
      return { key, label, origin, rank, at };
    })
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map(({ key, label, origin }) => ({ key, label, origin }))
    .reduce<ValueTableColumn[]>(withContainerTogether, []);
}

function containerOf(
  key: string,
  label: string
): { noun: SampleNoun; isCount: boolean } | undefined {
  const counted = SAMPLE_NOUNS.find(noun => columnKey(countLabel(noun)) === key);
  if (counted) return { noun: counted, isCount: true };
  const noun = perSampleNounOf(label);
  return noun && { noun, isCount: false };
}

function withContainerTogether(
  placed: ValueTableColumn[],
  column: ValueTableColumn,
  _at: number,
  all: readonly ValueTableColumn[]
): ValueTableColumn[] {
  if (placed.includes(column)) return placed;
  const container = containerOf(column.key, column.label);
  if (!container) return [...placed, column];
  const members = all.filter(
    candidate => containerOf(candidate.key, candidate.label)?.noun === container.noun
  );
  const isCount = (candidate: ValueTableColumn) =>
    !!containerOf(candidate.key, candidate.label)?.isCount;
  return [
    ...placed,
    ...members.filter(isCount),
    ...members.filter(candidate => !isCount(candidate)),
  ];
}

function groupOrder(key: string): number {
  if (key === UNSORTED_GROUP) return MATERIAL_GROUPS.length + 2;
  if (key === MIX_GROUP.key) return MATERIAL_GROUPS.length + 1;
  const known = MATERIAL_GROUPS.findIndex(group => group.key === key);
  return known === -1 ? MATERIAL_GROUPS.length : known;
}

function groupLabel(key: string): string {
  if (key === MIX_GROUP.key) return MIX_GROUP.label;
  return materialGroup(key).label;
}

export function buildValueTable(
  protocol: Pick<Protocol, 'cards'>,
  card: ValuesCard,
  { materials, board, needs, unsortedNames }: ValueTableSources
): ValueTableGroup[] {
  const valuesCards = protocol.cards.filter(
    (candidate): candidate is ValuesCard => candidate.type === 'values'
  );
  const isFirstCard = valuesCards[0]?.id === card.id;
  const materialsWithRowElsewhere = new Set(
    valuesCards
      .filter(values => values.id !== card.id)
      .flatMap(values => values.rows)
      .flatMap(valueRow => ('materialId' in valueRow ? [valueRow.materialId] : []))
  );
  const plates = protocol.cards.filter(isPlateMap);
  const matches = donorsIn(protocol);
  const subjects = countSubjects(protocol);
  const countedIds = new Set(subjects.map(subject => subject.material.id));
  const unsorted = new Set(unsortedNames.map(normalizeMaterialKey));
  const allMaterials = [...materials.values()].filter(material => material.name.trim());
  const listedMaterials = allMaterials.filter(material => !material.isSetAside);
  const swatchOf = plateSwatches(protocol, board);

  const rows: RowDraft[] = [];
  const rowByMaterial = new Map<string, RowDraft>();

  const draftRow = (
    id: string,
    name: string,
    groupKey: string,
    fields: Pick<ValueTableRow, 'valueRow' | 'material' | 'status'>
  ): RowDraft => {
    const row: RowDraft = {
      id,
      name,
      shownName: fields.material ? displayNameOf(fields.material) : name,
      groupKey,
      swatch: swatchOf(name),
      rail: { place: 'none' },
      isSubRow: false,
      cells: [],
      subRows: new Map(),
      ...fields,
    };
    rows.push(row);
    return row;
  };

  for (const valueRow of card.rows) {
    const material = 'materialId' in valueRow ? materials.get(valueRow.materialId) : undefined;
    const status: ValueRowStatus = !('materialId' in valueRow)
      ? 'current'
      : !material
        ? 'removed'
        : material.isSetAside
          ? 'setAside'
          : 'current';
    const groupKey = 'mixName' in valueRow ? MIX_GROUP.key : (material?.group ?? UNSORTED_GROUP);
    const row = draftRow(valueRow.id, valueRowName(valueRow, materials), groupKey, {
      valueRow,
      material,
      status,
    });
    if (material) rowByMaterial.set(material.id, row);
  }

  const rowForMaterial = (material: MaterialItem): RowDraft | undefined => {
    const existing = rowByMaterial.get(material.id);
    if (existing) return existing;
    if (!isFirstCard || materialsWithRowElsewhere.has(material.id)) return undefined;
    const row = draftRow(`material:${material.id}`, material.name.trim(), material.group, {
      valueRow: undefined,
      material,
      status: material.isSetAside ? 'setAside' : 'current',
    });
    rowByMaterial.set(material.id, row);
    return row;
  };

  const tableRowsById = new Map(rows.map(row => [row.id, row]));
  const mixRows = rows.filter(row => row.valueRow && 'mixName' in row.valueRow);
  for (const item of card.items) {
    const row = item.row ? tableRowsById.get(item.row) : undefined;
    if (!row) continue;
    const linked = linkedValueOf(card, item, materials);
    if ('materialField' in item) {
      if (
        !linked ||
        (countedIds.has(linked.material.id) && CELL_COUNT_KEYS.has(linked.field.key))
      ) {
        continue;
      }
      row.cells.push({
        id: item.id,
        nameId: `${linked.material.id}:${linked.field.key}`,
        columnKey: columnKey(linked.label),
        label: linked.label,
        fullName: linked.name,
        value: linked.value,
        unit: linked.unit,
        units: linked.units,
        isEditable: true,
        canRemove: true,
        note: '',
        neededFor: NOT_NEEDED,
        origin: 'materials',
        linkedTo: { kind: 'item', itemId: item.id },
      });
      continue;
    }
    row.cells.push({
      id: item.id,
      nameId: item.id,
      columnKey: columnKey(item.name),
      label: item.name.trim(),
      fullName: joinValueName(row.name, item.name),
      value: item.value,
      unit: item.unit,
      units: undefined,
      isEditable: true,
      canRemove: true,
      note: isSpellingOf(item.name, TOTAL_WELL_VOLUME.word)
        ? wellVolumeOnARow(assaySetupTitleOf(protocol.cards))
        : '',
      neededFor: NOT_NEEDED,
      origin: 'typed',
      linkedTo: { kind: 'item', itemId: item.id },
    });
  }

  const platesBySubject = new Map<string, Set<string>>();
  const plateRowsByPlate = plates.map(plateMap => {
    const plateRows = plateValueRows(plateMap);
    for (const row of plateRows) {
      const key = normalizeMaterialKey(plateSubject(row).subject);
      if (key) platesBySubject.set(key, (platesBySubject.get(key) ?? new Set()).add(plateMap.id));
    }
    return { plateMap, plateRows };
  });

  const subRowOf = (parent: RowDraft, name: string, shownName = name): ValueTableRow => {
    const key = normalizeMaterialKey(name);
    const existing = parent.subRows.get(key);
    if (existing) return existing;
    const row: ValueTableRow = {
      id: `${parent.id}|${key}`,
      name,
      shownName,
      valueRow: undefined,
      material: undefined,
      status: 'current',
      swatch: undefined,
      rail: { place: 'none' },
      isSubRow: true,
      cells: [],
    };
    parent.subRows.set(key, row);
    return row;
  };

  for (const subject of subjects) {
    const owner = rowForMaterial(subject.material);
    if (!owner) continue;
    const row = subject.donor ? subRowOf(owner, subject.donor.name.trim()) : owner;
    const taken = new Set(row.cells.map(cell => cell.columnKey));
    const cells = [
      ...countCells(subject, board),
      ...(subject.donor ? inheritedVolumeCells(subject, board) : []),
    ];
    row.cells.push(...cells.filter(cell => !taken.has(cell.columnKey)));
  }

  for (const { plateMap, plateRows } of plateRowsByPlate) {
    const plateMaterial = plateMaterialFor(plateMap, plates, allMaterials);
    const plateRow = plateMaterial
      ? rowForMaterial(plateMaterial)
      : isFirstCard
        ? draftRow(`plate:${plateMap.id}`, labwareTitle(plateMap), PLATE_GROUP_KEY, {
            valueRow: undefined,
            material: undefined,
            status: 'current',
          })
        : undefined;
    for (const row of plateRows) {
      const { subject, variant, label } = plateSubject(row);
      if (unsorted.has(normalizeMaterialKey(subject))) continue;
      const found = findDonor(matches, subject);
      const material = findMaterial(listedMaterials, subject) ?? found?.material;
      const owner = material
        ? rowForMaterial(material)
        : findNamed(mixRows, subject, candidate => candidate.name);
      const isOnSeveralPlates = (platesBySubject.get(normalizeMaterialKey(subject))?.size ?? 0) > 1;
      const variantText = /^\d+$/.test(variant) ? `series ${variant}` : variant;
      const tags = [
        found ? found.donor.name.trim() : '',
        isOnSeveralPlates ? labwareTitle(plateMap) : '',
        variantText,
      ].filter(Boolean);
      let target: ValueTableRow | undefined;
      if (material !== undefined || owner !== undefined) {
        target = owner && tags.length ? subRowOf(owner, tags.join(' · ')) : owner;
        if (found && target && !target.swatch) target.swatch = swatchOf(subject);
      } else if (plateRow) {
        target = subject ? subRowOf(plateRow, [subject, ...tags].join(' · ')) : plateRow;
        if (subject && !target.swatch) target.swatch = swatchOf(subject);
      }
      target?.cells.push({
        id: row.id,
        nameId: row.id,
        columnKey: columnKey(label),
        label,
        fullName: row.name,
        ...plateCellFields(row, labwareTitle(plateMap)),
        neededFor: NOT_NEEDED,
        origin: 'plate',
        linkedTo: { kind: 'plate', row },
      });
    }
  }

  for (const entry of board.names.values()) {
    if (entry.kind !== 'count') continue;
    for (const noun of SAMPLE_NOUNS) {
      const suffix = `:${lowerLead(countLabel(noun))}`;
      const material = entry.id.endsWith(suffix)
        ? materials.get(entry.id.slice(0, -suffix.length))
        : undefined;
      const row = material && rowForMaterial(material);
      row?.cells.push(wellsCell(entry, noun));
    }
  }

  for (const subject of subjects) {
    const owner = subject.donor && rowForMaterial(subject.material);
    if (!owner || !subject.donor) continue;
    const donorName = subject.donor.name.trim();
    for (const noun of sampleNounsOf(board.names, [subject.subject])) {
      const wells = findTermOn(board.names, WELLS, [subject.subject], noun);
      if (wells?.kind !== 'count' || !wells.id.startsWith(cellPartId(subject, 'wells'))) {
        continue;
      }
      const row = subRowOf(owner, donorName);
      const column = columnKey(countLabel(noun));
      if (!row.cells.some(cell => cell.columnKey === column))
        row.cells.push(wellsCell(wells, noun));
    }
  }

  for (const material of listedMaterials) {
    if (material.recipe.length) rowForMaterial(material);
  }
  for (const row of [...rows]) {
    const { material } = row;
    if (!material?.recipe.length) continue;
    const placements = recipePlacements(material, board.names);
    const stockAmount = material.values[STOCK_FIELD] ?? '';
    if (material.units[STOCK_FIELD] === FOLD_UNIT && stockAmount.trim()) {
      row.cells.push(
        ...placements.map(placement =>
          workedCell(
            `${row.id}:final${placement.idEnd}`,
            `${finalConcentrationName(row.name)}${placement.nameEnd}`,
            board.results.get(`${mixFinalId(material.id)}${placement.idEnd}`),
            placement
          )
        )
      );
    }
    for (const entry of material.recipe) {
      const ingredient = materials.get(entry.materialId);
      const ingredientName = ingredient?.name.trim() ?? 'Removed from Materials';
      const subRow = subRowOf(row, ingredientName, ingredient && displayNameOf(ingredient));
      subRow.cells.push(
        {
          id: `${row.id}:recipe:${entry.id}`,
          nameId: `${material.id}:recipe:${entry.id}`,
          columnKey: columnKey(MIX_CONCENTRATION.word),
          label: MIX_CONCENTRATION.word,
          fullName: mixConcentrationName(row.name, ingredientName),
          value: entry.amount,
          unit: entry.unit,
          units: undefined,
          isEditable: true,
          canRemove: false,
          note: '',
          neededFor: NOT_NEEDED,
          origin: 'materials',
          linkedTo: { kind: 'recipe', materialId: material.id, entryId: entry.id },
        },
        ...placements.map(placement =>
          workedCell(
            `${row.id}:recipe:${entry.id}:final${placement.idEnd}`,
            `${finalConcentrationName(`${row.name} ${ingredientName}`)}${placement.nameEnd}`,
            board.results.get(`${recipeFinalId(material.id, entry.id)}${placement.idEnd}`),
            placement
          )
        )
      );
    }
  }

  for (const need of needs) {
    if (need.kind !== 'absent' || need.routed.destination.kind === 'general') continue;
    const { destination, fullName } = need.routed;
    const material = destination.materialId ? materials.get(destination.materialId) : undefined;
    const row =
      (destination.kind === 'row' && destination.valueRowId
        ? tableRowsById.get(destination.valueRowId)
        : undefined) ??
      (material && rowForMaterial(material));
    if (!row) continue;
    const field = destination.kind === 'field' ? destination.field : undefined;
    const label =
      destination.kind === 'row'
        ? destination.label
        : material
          ? fieldLabel(material, destination.field)
          : '';
    const key = columnKey(label);
    if (!key || row.cells.some(cell => cell.columnKey === key)) continue;
    row.cells.push({
      id: `need:${row.id}:${key}`,
      nameId: `need:${row.id}:${key}`,
      columnKey: key,
      label,
      fullName,
      value: '',
      unit: field && material ? fieldUnit(material, field) : '',
      units: field?.unit === UNIT_PER_ITEM ? (field.units ?? []) : undefined,
      isEditable: true,
      canRemove: false,
      note: '',
      neededFor: need.neededFor,
      origin: field ? 'materials' : 'typed',
      linkedTo: { kind: 'need', routed: need.routed },
    });
  }

  const blankNeeds = new Map(
    needs.flatMap(need => (need.kind === 'blank' ? [[need.id, need.neededFor] as const] : []))
  );
  for (const cell of rows.flatMap(row => [
    ...row.cells,
    ...[...row.subRows.values()].flatMap(subRow => subRow.cells),
  ])) {
    const neededFor = blankNeeds.get(cell.nameId);
    if (neededFor && cell.isEditable && !cell.value.trim()) cell.neededFor = neededFor;
  }
  for (const row of rows.flatMap(row => [row, ...row.subRows.values()])) {
    const isCountedPerContainer = row.cells.some(
      cell => containerOf(cell.columnKey, cell.label)?.isCount && cell.columnKey !== SAMPLES_COLUMN
    );
    if (isCountedPerContainer) {
      row.cells = row.cells.filter(cell => cell.columnKey !== SAMPLES_COLUMN);
    }
  }

  const groupKeys = [...new Set(rows.map(row => row.groupKey))].sort(
    (a, b) => groupOrder(a) - groupOrder(b)
  );
  return groupKeys.map(key => {
    const groupRows = rows
      .filter(row => row.groupKey === key)
      .flatMap(({ groupKey: _groupKey, subRows, ...row }): ValueTableRow[] => {
        const attached = [...subRows.values()];
        if (!attached.length) return [row];
        const color = row.swatch?.color;
        return [
          { ...row, rail: { place: 'start', color } },
          ...attached.map(
            (subRow, index): ValueTableRow => ({
              ...subRow,
              rail: { place: index === attached.length - 1 ? 'end' : 'middle', color },
            })
          ),
        ];
      });
    return { key, label: groupLabel(key), columns: orderColumns(groupRows), rows: groupRows };
  });
}
