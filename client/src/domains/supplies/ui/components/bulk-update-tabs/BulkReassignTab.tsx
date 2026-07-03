/**
 * Bulk Reassign Category Tab
 *
 * Category selector for reassigning selected items to a different category.
 */

import { useMemo } from 'react';

import { Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';

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
      <p className="text-body text-muted-foreground">
        Move {selectedCount} selected item{selectedCount !== 1 ? 's' : ''} to a different category.
      </p>
      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
        <label id="bulk-reassign-category-label" className={FIELD_LABEL_COMPACT}>
          Category
        </label>
        <Select
          aria-labelledby="bulk-reassign-category-label"
          options={categoryOptions}
          value={targetCategoryId}
          onChange={v => onTargetChange(String(v ?? ''))}
          fullWidth
          renderOption={option =>
            option.description ? (
              <span className="pl-4 text-body-sm">{option.label}</span>
            ) : (
              <span className="text-body-sm font-semibold">{option.label}</span>
            )
          }
        />
      </div>
    </div>
  );
}
