/**
 * Category Hierarchy Select
 *
 * Nested dropdown over any parent/child structure — catalog categories and the lab location tree.
 */

import { useMemo } from 'react';

import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import { Select, type SelectOption } from '../../primitives';
import { FIELD_LABEL_COMPACT } from '../inputs/fieldLabelClass';

interface CategoryHierarchySelectProps {
  categories: Array<{ id: string; name: string; parentId: string | null; sortOrder: number }>;
  value: string;
  onChange: (value: string) => void;
  labelId: string;
  error?: string;
  placeholder?: string;
  label?: string;
}

export function CategoryHierarchySelect({
  categories,
  value,
  onChange,
  labelId,
  error,
  placeholder = 'Select category...',
  label = 'Category',
}: CategoryHierarchySelectProps) {
  const categoryOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [{ value: '', label: placeholder }];
    const pushTier = (parentId: string | null, parentName?: string) => {
      categories
        .filter(c => (c.parentId ?? null) === parentId)
        .sort(compareByOrderThenName)
        .forEach(node => {
          options.push({ value: node.id, label: node.name, description: parentName });
          pushTier(node.id, node.name);
        });
    };
    pushTier(null);
    return options;
  }, [categories, placeholder]);

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
      <label id={labelId} className={FIELD_LABEL_COMPACT}>
        {label}
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
