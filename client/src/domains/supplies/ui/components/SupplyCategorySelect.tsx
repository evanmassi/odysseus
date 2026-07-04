/**
 * Supply Category Select
 *
 * Category dropdown with a parent → subcategory hierarchy, shared by the item
 * form and the bulk reassign tab.
 */

import { useMemo } from 'react';

import { Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import type { SupplyCategory } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface SupplyCategorySelectProps {
  categories: SupplyCategory[];
  value: string;
  onChange: (value: string) => void;
  labelId: string;
  error?: string;
  placeholder?: string;
}

export function SupplyCategorySelect({
  categories,
  value,
  onChange,
  labelId,
  error,
  placeholder = 'Select category...',
}: SupplyCategorySelectProps) {
  const categoryOptions: SelectOption[] = useMemo(() => {
    const topLevel = categories.filter(c => !c.parentId).sort(compareByOrderThenName);
    const options: SelectOption[] = [{ value: '', label: placeholder }];
    topLevel.forEach(parent => {
      options.push({ value: parent.id, label: parent.name });
      categories
        .filter(c => c.parentId === parent.id)
        .sort(compareByOrderThenName)
        .forEach(sub => options.push({ value: sub.id, label: sub.name, description: parent.name }));
    });
    return options;
  }, [categories, placeholder]);

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
      <label id={labelId} className={FIELD_LABEL_COMPACT}>
        Category
      </label>
      <Select
        aria-labelledby={labelId}
        options={categoryOptions}
        value={value ?? ''}
        onChange={v => onChange(String(v ?? ''))}
        state={error ? 'error' : 'default'}
        error={error}
        fullWidth
        renderOption={option => (
          <div className="w-full">
            {option.description ? (
              <span className="pl-4 text-body">{option.label}</span>
            ) : (
              <span className="text-body font-semibold">{option.label}</span>
            )}
          </div>
        )}
        renderValue={selected => {
          const opt = selected[0];
          if (!opt?.value) {
            return <span className="text-muted-foreground opacity-40">{placeholder}</span>;
          }
          return opt.description ? (
            <span className="text-body text-foreground">
              <span className="text-muted-foreground">{opt.description}</span>
              <span className="mx-1 text-muted-foreground">›</span>
              {opt.label}
            </span>
          ) : (
            <span className="text-body text-foreground">{opt.label}</span>
          );
        }}
      />
    </div>
  );
}
