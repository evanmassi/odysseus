import { Layers, Plus } from 'lucide-react';

import { Button, Tooltip } from '../../primitives';
import { DemoLockIndicator } from '../info-display/DemoLockIndicator';

interface CatalogActionBarProps {
  addItemLabel: string;
  isTaxonomyLocked: boolean;
  onBulkOperations: () => void;
  onAddCategory: () => void;
  onAddItem: () => void;
}

export function CatalogActionBar({
  addItemLabel,
  isTaxonomyLocked,
  onBulkOperations,
  onAddCategory,
  onAddItem,
}: CatalogActionBarProps) {
  return (
    <div className="ml-auto flex flex-shrink-0 items-center gap-2">
      <Tooltip content="Bulk Operations" side="bottom">
        <Button
          variant="secondary"
          size="sm"
          iconOnly
          onClick={onBulkOperations}
          className="h-8 flex-shrink-0"
          aria-label="Bulk Operations"
        >
          <Layers className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
      {isTaxonomyLocked ? (
        <DemoLockIndicator side="left" />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAddCategory}
          className="h-8 flex-shrink-0"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add Category
        </Button>
      )}
      <Button
        size="sm"
        onClick={onAddItem}
        className="h-8 flex-shrink-0"
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        {addItemLabel}
      </Button>
    </div>
  );
}
