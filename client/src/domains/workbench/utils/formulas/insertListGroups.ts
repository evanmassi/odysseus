import { materialGroupsOf } from '../materials/materialCatalog';
import { UNSORTED_GROUP } from '../materials/materialItems';

import { sectionKeyOf, WHOLE_EXPERIMENT } from './calculationSections';
import { nameWithinOwner } from './formulaScopes';
import { describeName } from './nameDisplay';

import type { BoardCalculation } from './boardCalculation';
import type { MaterialItem } from '@odysseus/shared-schemas';

export interface InsertListRow {
  name: string;
  label: string;
  value?: string;
}

export interface InsertListGroup {
  key: string;
  title: string;
  kind: string;
  headingName?: string;
  rows: InsertListRow[];
}

const WHOLE_EXPERIMENT_TITLE = 'Whole experiment';

function inCardOrder(materials: readonly MaterialItem[], customGroups: readonly string[]) {
  const order = materialGroupsOf(customGroups).map(group => group.key);
  const rank = (item: MaterialItem) =>
    item.group === UNSORTED_GROUP ? -1 : order.indexOf(item.group);
  return [...materials].sort((a, b) => rank(a) - rank(b));
}

export function insertListGroups(
  calculation: BoardCalculation,
  materials: readonly MaterialItem[],
  customGroups: readonly string[],
  isForFormula: boolean
): InsertListGroup[] {
  const entries = [...calculation.names.values()];
  const materialGroups = inCardOrder(materials, customGroups).map(
    (material): InsertListGroup => ({
      key: material.id,
      title: material.name.trim(),
      kind: material.type,
      ...(!isForFormula && { headingName: material.name.trim() }),
      rows: [],
    })
  );
  const groups = new Map(materialGroups.map(group => [group.key, group]));
  const workedOut = new Map<string, InsertListRow[]>();
  const groupFor = (key: string, title: string, kind = '') => {
    const found = groups.get(key) ?? { key, title, kind, rows: [] };
    groups.set(key, found);
    return found;
  };

  for (const entry of entries) {
    if ('isDropped' in entry && entry.isDropped) continue;
    const shown = describeName(calculation, entry.name).text;
    const value = shown === entry.name ? undefined : shown;
    if (entry.kind === 'item') {
      if (isForFormula || groups.has(entry.id)) continue;
      groupFor(`list:${entry.groupTitle}`, entry.groupTitle).rows.push({
        name: entry.name,
        label: entry.name,
        value,
      });
      continue;
    }
    const key = sectionKeyOf(entry.name, entry.workedOut, materials);
    const group =
      key === WHOLE_EXPERIMENT
        ? groupFor(WHOLE_EXPERIMENT, WHOLE_EXPERIMENT_TITLE)
        : groupFor(key, entry.workedOut?.subject ?? '');
    const row = { name: entry.name, label: nameWithinOwner(entry.name, group.title), value };
    if (entry.workedOut) workedOut.set(group.key, [...(workedOut.get(group.key) ?? []), row]);
    else group.rows.push(row);
  }
  for (const [key, rows] of workedOut) groups.get(key)?.rows.push(...rows);

  const whole = groups.get(WHOLE_EXPERIMENT);
  groups.delete(WHOLE_EXPERIMENT);
  return [...groups.values(), ...(whole ? [whole] : [])].filter(
    group => group.rows.length || group.headingName
  );
}
