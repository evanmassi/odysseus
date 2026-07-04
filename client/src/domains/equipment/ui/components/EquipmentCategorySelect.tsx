/**
 * Equipment Category Select
 *
 * Category dropdown with a parent → subcategory hierarchy, shared by the edit
 * and bulk-relocate forms.
 */

import { useMemo } from 'react';

import { Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import type { EquipmentCategory } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface EquipmentCategorySelectProps {
  categories: EquipmentCategory[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  labelId: string;
}

export function EquipmentCategorySelect({
  categories,
  value,
  onChange,
  error,
  labelId,
}: EquipmentCategorySelectProps) {
  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      if (c.parentId) {
        const parent = categories.find(p => p.id === c.parentId);
        if (parent) map.set(c.id, parent.name);
      }
    });
    return map;
  }, [categories]);

  const categoryOptions: SelectOption[] = useMemo(() => {
    const topLevel = categories.filter(c => !c.parentId).sort(compareByOrderThenName);

    const options: SelectOption[] = [];
    topLevel.forEach(parent => {
      options.push({ value: parent.id, label: parent.name });
      const subs = categories.filter(c => c.parentId === parent.id).sort(compareByOrderThenName);
      subs.forEach(sub => {
        options.push({ value: sub.id, label: sub.name, description: parent.name });
      });
    });
    return options;
  }, [categories]);

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
      <label id={labelId} className={FIELD_LABEL_COMPACT}>
        Category
      </label>
      <Select
        options={[{ value: '', label: 'Select category...' }, ...categoryOptions]}
        value={value ?? ''}
        onChange={v => onChange(String(v ?? ''))}
        state={error ? 'error' : 'default'}
        error={error}
        fullWidth
        aria-labelledby={labelId}
        renderOption={option => {
          const isSub = !!option.description;
          return (
            <div className="w-full">
              {isSub ? (
                <span className="pl-4 text-body">{option.label}</span>
              ) : (
                <span className="text-body font-semibold">{option.label}</span>
              )}
            </div>
          );
        }}
        renderValue={selected => {
          const opt = selected[0];
          if (!opt) {
            return <span className="text-muted-foreground opacity-40">Select category...</span>;
          }
          const parentName = parentNameMap.get(opt.value as string);
          if (parentName) {
            return (
              <span className="text-body text-foreground">
                <span className="text-muted-foreground">{parentName}</span>
                <span className="mx-1 text-muted-foreground">›</span>
                {opt.label}
              </span>
            );
          }
          return <span className="text-body text-foreground">{opt.label}</span>;
        }}
      />
    </div>
  );
}
