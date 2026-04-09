/**
 * Bulk Reassign Category Tab
 *
 * Category selector for reassigning selected items to a different category.
 */

import { useMemo } from 'react';

import { Select } from '@shared/ui';

import type { SupplyCategory } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface BulkReassignTabProps {
  categories: SupplyCategory[];
  selectedCount: number;
  targetCategoryId: string;
  onTargetChange: (categoryId: string) => void;
}

export function BulkReassignTab({
  categories,
  selectedCount,
  targetCategoryId,
  onTargetChange,
}: BulkReassignTabProps) {
  const topLevel = useMemo(
    () =>
      categories
        .filter(c => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  const categoryOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [{ value: '', label: 'Select target category...' }];
    topLevel.forEach(parent => {
      options.push({ value: parent.id, label: parent.name });
      categories
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .forEach(sub => {
          options.push({ value: sub.id, label: sub.name, description: parent.name });
        });
    });
    return options;
  }, [topLevel, categories]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Move {selectedCount} selected item{selectedCount !== 1 ? 's' : ''} to a different category.
      </p>
      <Select
        label="Category"
        options={categoryOptions}
        value={targetCategoryId}
        onChange={v => onTargetChange(String(v ?? ''))}
        fullWidth
        renderOption={option =>
          option.description ? (
            <span className="pl-4 text-sm">{option.label}</span>
          ) : (
            <span className="text-sm font-semibold">{option.label}</span>
          )
        }
      />
    </div>
  );
}
