import {
  bandColorOf,
  colorLineOf,
  type MaterialItem,
  type Protocol,
  type ValuesBlock,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { STOCK_FIELD } from '../dilutions/dilutionStock';
import { displayValue, FOLD_UNIT } from '../formulas/quantities';
import { MATERIAL_GROUPS, materialGroup } from '../materials/materialCatalog';
import { normalizeMaterialKey } from '../materials/materialGuesser';
import { findNamed } from '../materials/materialLookup';

import { scaledAmount, wellShareOf, type WellShare } from './mixShares';
import { canRemovePlateRow, plateValueRows, type PlateValueRow } from './plateValueRows';
import { linkedValueOf, sectionName } from './valueEdits';
import { columnKey, joinValueName } from './valueNames';

import type { BoardCalculation } from '../formulas/boardCalculation';

type ValueSection = ValuesBlock['sections'][number];

export type ValueOrigin = 'typed' | 'plate' | 'materials' | 'worked';

export type ValueCellSource =
  | { kind: 'item'; itemId: string }
  | { kind: 'plate'; row: PlateValueRow }
  | { kind: 'wells' }
  | { kind: 'recipe'; materialId: string; entryId: string }
  | { kind: 'worked' };

export interface ValueTableCell {
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
  origin: ValueOrigin;
  source: ValueCellSource;
}

export type ValueRowStatus = 'current' | 'dropped' | 'missing';

export interface ValueRowSwatch {
  color: string;
  isOutline: boolean;
}

export type ValueRowRail =
  | { place: 'none' }
  | { place: 'start' | 'middle' | 'end'; color: string | undefined };

export interface ValueTableRow {
  id: string;
  name: string;
  section: ValueSection | undefined;
  material: MaterialItem | undefined;
  status: ValueRowStatus;
  swatch: ValueRowSwatch | undefined;
  isSubRow: boolean;
  rail: ValueRowRail;
  cells: ValueTableCell[];
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

interface RowDraft extends ValueTableRow {
  groupKey: string;
  subRows: Map<string, ValueTableRow>;
}

const MIX_GROUP = { key: 'mix', label: 'Mixes' };
const PLATE_GROUP_KEY = 'supplies';
const MISSING_GROUP_KEY = 'unsorted';
const ORIGIN_RANK: Record<ValueOrigin, number> = { typed: 0, plate: 1, materials: 2, worked: 3 };
const IN_THE_MIX = 'In the mix';
const FINAL_IN_THE_WELL = 'Final in the well';
const WELLS_SUFFIX = ':wells';

const isVesselMap = (block: Protocol['blocks'][number]): block is VesselMapBlock =>
  block.type === 'plate';

function plateMaterialFor(
  plate: VesselMapBlock,
  plates: readonly VesselMapBlock[],
  materials: readonly MaterialItem[]
): MaterialItem | undefined {
  return materials.find(material => {
    if (material.type !== 'Plate') return false;
    const key = normalizeMaterialKey(material.name);
    const matched =
      plates.find(candidate => key && normalizeMaterialKey(candidate.title).includes(key)) ??
      (plates.length === 1 ? plates[0] : undefined);
    return matched === plate;
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

function plateCellFields(row: PlateValueRow) {
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
      note: count.count === count.tally ? '' : `Typed in; the plate map has ${count.tally}`,
    };
  }
  const from = source.amount.source;
  const isFixedUnit = from.kind === 'points' || (from.kind === 'series' && from.field === 'fold');
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
  amount: string,
  unit: string,
  share: WellShare
): ValueTableCell {
  const value = 'share' in share ? (scaledAmount(amount, unit, share.share) ?? '') : '';
  const note =
    'share' in share ? `Worked out: ${displayValue(amount, unit)} ${share.working}` : share.missing;
  return {
    id,
    nameId: id,
    columnKey: columnKey(FINAL_IN_THE_WELL),
    label: FINAL_IN_THE_WELL,
    fullName,
    value,
    unit: '',
    units: [],
    isEditable: false,
    canRemove: false,
    note,
    origin: 'worked',
    source: { kind: 'worked' },
  };
}

function orderColumns(rows: readonly ValueTableRow[]): ValueTableColumn[] {
  const columns = new Map<string, { label: string; origins: Set<ValueOrigin>; at: number }>();
  for (const cell of rows.flatMap(row => row.cells)) {
    const column = columns.get(cell.columnKey) ?? {
      label: cell.label,
      origins: new Set<ValueOrigin>(),
      at: columns.size,
    };
    column.origins.add(cell.origin);
    columns.set(cell.columnKey, column);
  }
  return [...columns]
    .map(([key, { label, origins, at }]) => {
      const rank = Math.min(...[...origins].map(origin => ORIGIN_RANK[origin]));
      const origin: ValueOrigin = origins.size === 1 ? [...origins][0] : 'typed';
      return { key, label, origin, rank, at };
    })
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map(({ key, label, origin }) => ({ key, label, origin }));
}

function groupOrder(key: string): number {
  if (key === MIX_GROUP.key) return MATERIAL_GROUPS.length + 1;
  const known = MATERIAL_GROUPS.findIndex(group => group.key === key);
  return known === -1 ? MATERIAL_GROUPS.length : known;
}

function groupLabel(key: string): string {
  if (key === MIX_GROUP.key) return MIX_GROUP.label;
  return materialGroup(key).label;
}

export function buildValueTable(
  protocol: Protocol,
  block: ValuesBlock,
  materials: ReadonlyMap<string, MaterialItem>,
  calculation: BoardCalculation
): ValueTableGroup[] {
  const valuesBlocks = protocol.blocks.filter(
    (candidate): candidate is ValuesBlock => candidate.type === 'values'
  );
  const isFirstBlock = valuesBlocks[0]?.id === block.id;
  const sectionedElsewhere = new Set(
    valuesBlocks
      .filter(values => values.id !== block.id)
      .flatMap(values => values.sections)
      .flatMap(section => ('materialId' in section ? [section.materialId] : []))
  );
  const plates = protocol.blocks.filter(isVesselMap);
  const allMaterials = [...materials.values()].filter(material => material.name.trim());
  const listedMaterials = allMaterials.filter(material => !material.isDropped);
  const swatches = plates.flatMap(plate => {
    const colorLine = colorLineOf(plate);
    const treatmentsFirst = [...plate.lines].sort(
      (a, b) => Number(b === colorLine) - Number(a === colorLine)
    );
    return treatmentsFirst.flatMap(line =>
      line.values.flatMap(value => {
        const isOutline = line !== colorLine;
        const color = isOutline ? bandColorOf(plate, value) : value.color;
        return color ? [{ name: value.text, color, isOutline }] : [];
      })
    );
  });
  const swatchOf = (name: string): ValueRowSwatch | undefined => {
    const found = findNamed(swatches, name, swatch => swatch.name);
    return found && { color: found.color, isOutline: found.isOutline };
  };

  const rows: RowDraft[] = [];
  const rowByMaterial = new Map<string, RowDraft>();

  const draftRow = (
    id: string,
    name: string,
    groupKey: string,
    fields: Pick<ValueTableRow, 'section' | 'material' | 'status'>
  ): RowDraft => {
    const row: RowDraft = {
      id,
      name,
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

  for (const section of block.sections) {
    const material = 'materialId' in section ? materials.get(section.materialId) : undefined;
    const status: ValueRowStatus = !('materialId' in section)
      ? 'current'
      : !material
        ? 'missing'
        : material.isDropped
          ? 'dropped'
          : 'current';
    const groupKey = 'mixName' in section ? MIX_GROUP.key : (material?.group ?? MISSING_GROUP_KEY);
    const row = draftRow(section.id, sectionName(section, materials), groupKey, {
      section,
      material,
      status,
    });
    if (material) rowByMaterial.set(material.id, row);
  }

  const rowForMaterial = (material: MaterialItem): RowDraft | undefined => {
    const existing = rowByMaterial.get(material.id);
    if (existing) return existing;
    if (!isFirstBlock || sectionedElsewhere.has(material.id)) return undefined;
    const row = draftRow(`material:${material.id}`, material.name.trim(), material.group, {
      section: undefined,
      material,
      status: material.isDropped ? 'dropped' : 'current',
    });
    rowByMaterial.set(material.id, row);
    return row;
  };

  const sectionRows = new Map(rows.map(row => [row.id, row]));
  const mixRows = rows.filter(row => row.section && 'mixName' in row.section);
  for (const item of block.items) {
    const row = item.section ? sectionRows.get(item.section) : undefined;
    if (!row) continue;
    const linked = linkedValueOf(block, item, materials);
    if ('materialField' in item) {
      if (!linked) continue;
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
        origin: 'materials',
        source: { kind: 'item', itemId: item.id },
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
      note: '',
      origin: 'typed',
      source: { kind: 'item', itemId: item.id },
    });
  }

  const platesBySubject = new Map<string, Set<string>>();
  const plateRowsByPlate = plates.map(plate => {
    const plateRows = plateValueRows(plate);
    for (const row of plateRows) {
      const key = normalizeMaterialKey(plateSubject(row).subject);
      if (key) platesBySubject.set(key, (platesBySubject.get(key) ?? new Set()).add(plate.id));
    }
    return { plate, plateRows };
  });

  const subRowOf = (parent: RowDraft, name: string): ValueTableRow => {
    const key = normalizeMaterialKey(name);
    const existing = parent.subRows.get(key);
    if (existing) return existing;
    const row: ValueTableRow = {
      id: `${parent.id}|${key}`,
      name,
      section: undefined,
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

  for (const { plate, plateRows } of plateRowsByPlate) {
    const plateMaterial = plateMaterialFor(plate, plates, allMaterials);
    const plateRow = plateMaterial
      ? rowForMaterial(plateMaterial)
      : isFirstBlock
        ? draftRow(`plate:${plate.id}`, plate.title.trim(), PLATE_GROUP_KEY, {
            section: undefined,
            material: undefined,
            status: 'current',
          })
        : undefined;
    for (const row of plateRows) {
      const { subject, variant, label } = plateSubject(row);
      const material = findNamed(listedMaterials, subject, candidate => candidate.name);
      const owner = material
        ? rowForMaterial(material)
        : findNamed(mixRows, subject, candidate => candidate.name);
      const isOnSeveralPlates = (platesBySubject.get(normalizeMaterialKey(subject))?.size ?? 0) > 1;
      const variantText = /^\d+$/.test(variant) ? `series ${variant}` : variant;
      const tags = [isOnSeveralPlates ? plate.title.trim() : '', variantText].filter(Boolean);
      let target: ValueTableRow | undefined;
      if (material !== undefined || owner !== undefined) {
        target = owner && tags.length ? subRowOf(owner, tags.join(' · ')) : owner;
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
        ...plateCellFields(row),
        origin: 'plate',
        source: { kind: 'plate', row },
      });
    }
  }

  for (const entry of calculation.names.values()) {
    if (entry.kind !== 'count' || !entry.id.endsWith(WELLS_SUFFIX)) continue;
    const material = materials.get(entry.id.slice(0, -WELLS_SUFFIX.length));
    const row = material && rowForMaterial(material);
    row?.cells.push({
      id: entry.id,
      nameId: entry.id,
      columnKey: columnKey('Wells'),
      label: 'Wells',
      fullName: entry.name,
      value: String(entry.count),
      unit: '',
      units: [],
      isEditable: false,
      canRemove: false,
      note: '',
      origin: 'plate',
      source: { kind: 'wells' },
    });
  }

  for (const material of listedMaterials) {
    if (material.recipe.length) rowForMaterial(material);
  }
  for (const row of [...rows]) {
    const { material } = row;
    if (!material?.recipe.length) continue;
    const share = wellShareOf(row.cells, calculation);
    const stockAmount = material.values[STOCK_FIELD] ?? '';
    if (material.units[STOCK_FIELD] === FOLD_UNIT && stockAmount.trim()) {
      row.cells.push(
        workedCell(`${row.id}:final`, `${row.name} in the well`, stockAmount, FOLD_UNIT, share)
      );
    }
    for (const entry of material.recipe) {
      const ingredient = materials.get(entry.materialId);
      const ingredientName = ingredient?.name.trim() ?? 'No longer in Materials';
      const subRow = subRowOf(row, ingredientName);
      subRow.cells.push(
        {
          id: `${row.id}:recipe:${entry.id}`,
          nameId: `${row.id}:recipe:${entry.id}`,
          columnKey: columnKey(IN_THE_MIX),
          label: IN_THE_MIX,
          fullName: `${ingredientName} in ${row.name}`,
          value: entry.amount,
          unit: entry.unit,
          units: undefined,
          isEditable: true,
          canRemove: false,
          note: '',
          origin: 'materials',
          source: { kind: 'recipe', materialId: material.id, entryId: entry.id },
        },
        workedCell(
          `${row.id}:recipe:${entry.id}:final`,
          `${ingredientName} in the well`,
          entry.amount,
          entry.unit,
          share
        )
      );
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
