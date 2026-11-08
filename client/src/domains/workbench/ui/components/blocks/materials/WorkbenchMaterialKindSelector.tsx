import { Select } from '@shared/ui';

import { UNSORTED_GROUP } from '../../../../utils/materials/materialItems';

import {
  NEW_GROUP_VALUE,
  kindOptions,
  kindValue,
  parseKindValue,
  type MaterialKind,
} from './materialSelectOptions';

interface WorkbenchMaterialKindSelectorProps {
  kind: MaterialKind;
  customGroups: readonly string[];
  onChoose: (kind: MaterialKind) => void;
  onNewGroup: () => void;
  className?: string;
}

export function WorkbenchMaterialKindSelector({
  kind,
  customGroups,
  onChoose,
  onNewGroup,
  className = '',
}: WorkbenchMaterialKindSelectorProps) {
  const isUnsorted = kind.group === UNSORTED_GROUP;
  return (
    <Select
      size="xs"
      options={kindOptions(customGroups)}
      value={kindValue(kind)}
      aria-label="Kind of material"
      className={`min-w-40 max-w-72 ${className}`}
      renderValue={([selected]) => (
        <span className={isUnsorted ? 'text-warning-text' : 'text-foreground'}>
          {selected.label}
        </span>
      )}
      onChange={value => {
        if (value === NEW_GROUP_VALUE) onNewGroup();
        else if (typeof value === 'string') onChoose(parseKindValue(value));
      }}
    />
  );
}
