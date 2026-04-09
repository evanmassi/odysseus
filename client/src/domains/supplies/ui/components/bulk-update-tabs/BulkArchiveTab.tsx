/**
 * Bulk Archive Tab
 *
 * Confirmation message for archiving selected products.
 */

interface BulkArchiveTabProps {
  selectedCount: number;
}

export function BulkArchiveTab({ selectedCount }: BulkArchiveTabProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Archive {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}. Archived products
        are hidden by default but their transaction history is preserved.
      </p>
    </div>
  );
}
