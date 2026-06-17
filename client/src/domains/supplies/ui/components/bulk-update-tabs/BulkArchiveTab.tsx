/**
 * Bulk Archive Tab
 *
 * Confirmation message for archiving selected items.
 */

interface BulkArchiveTabProps {
  selectedCount: number;
}

export function BulkArchiveTab({ selectedCount }: BulkArchiveTabProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Archive {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}. Archived items are
        hidden by default but their transaction history is preserved.
      </p>
    </div>
  );
}
