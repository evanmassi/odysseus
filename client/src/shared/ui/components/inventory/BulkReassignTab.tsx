/**
 * Bulk Reassign Category Tab
 *
 * Category selector for reassigning selected items to a different category.
 */

import { buildHierarchyOptions, Select, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';

interface BulkReassignTabProps {
  categories: Array<{ id: string; name: string; parentId: string | null; sortOrder: number }>;
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
      <Select
        label="Category"
        labelClassName={FIELD_LABEL_COMPACT}
        options={withPlaceholder('Select target category...', buildHierarchyOptions(categories))}
        value={targetCategoryId}
        onChange={v => onTargetChange(String(v ?? ''))}
        fullWidth
      />
    </div>
  );
}
