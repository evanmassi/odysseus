/**
 * Bulk Reassign Category Tab
 *
 * Category selector for reassigning selected items to a different category.
 */

import { SupplyCategorySelect } from '../SupplyCategorySelect';

import type { SupplyCategory } from '@odysseus/shared-schemas';

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
  return (
    <div className="space-y-3">
      <p className="text-body text-muted-foreground">
        Move {selectedCount} selected item{selectedCount !== 1 ? 's' : ''} to a different category.
      </p>
      <SupplyCategorySelect
        categories={categories}
        value={targetCategoryId}
        onChange={onTargetChange}
        labelId="bulk-reassign-category-label"
        placeholder="Select target category..."
      />
    </div>
  );
}
