import { materialGroupsOf } from '../../../../utils/materials/materialCatalog';
import { OTHER_TYPE, UNSORTED_GROUP } from '../../../../utils/materials/materialItems';
import { VALUE_UNIT_OPTIONS } from '../../../../utils/values/valueUnits';

import type { SelectOption } from '@shared/ui';

export const NEW_GROUP_VALUE = '__new';
const NEW_GROUP_HEADING = 'More';
const KIND_SEPARATOR = '|';
const NO_CHOICE_LABEL = '—';

export interface MaterialKind {
  group: string;
  type: string;
}

export const kindValue = ({ group, type }: MaterialKind): string =>
  `${group}${KIND_SEPARATOR}${type}`;

export function parseKindValue(value: string): MaterialKind {
  const [group, type] = value.split(KIND_SEPARATOR);
  return { group, type };
}

export function kindOptions(customGroups: readonly string[]): SelectOption[] {
  const options = materialGroupsOf(customGroups).flatMap(group => {
    const types =
      group.key === UNSORTED_GROUP ? [OTHER_TYPE] : [...Object.keys(group.types), OTHER_TYPE];
    return types.map(type => ({
      value: kindValue({ group: group.key, type }),
      label:
        group.key === UNSORTED_GROUP
          ? 'Unsorted'
          : type === OTHER_TYPE
            ? `Other ${group.label.toLowerCase()}`
            : type,
      group: group.label,
    }));
  });
  return [...options, { value: NEW_GROUP_VALUE, label: 'New group…', group: NEW_GROUP_HEADING }];
}

export function unitOptions(units: readonly string[]): SelectOption[] {
  const known = VALUE_UNIT_OPTIONS.filter(option => units.includes(String(option.value)));
  const loose = units
    .filter(unit => !known.some(option => option.value === unit))
    .map(unit => ({ value: unit, label: unit || 'none' }));
  const isGrouped = new Set(known.map(option => option.group)).size > 1;
  return [...loose, ...known.map(option => (isGrouped ? option : { ...option, group: undefined }))];
}

export const choiceOptions = (choices: readonly string[]): SelectOption[] => [
  { value: '', label: NO_CHOICE_LABEL },
  ...choices.map(choice => ({ value: choice, label: choice })),
];
