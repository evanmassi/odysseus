/**
 * Location Catalog Panel
 *
 * The locations leaf of the catalog rail. A location tree needs room to show what sits inside
 * what, so editing happens in its own modal and this pane only counts the tree and opens it.
 */

import { MapPin } from 'lucide-react';

import { Button, Chip, ConsolePanel, HeaderStrip, StripLabel } from '@shared/ui';

interface LocationCatalogPanelProps {
  count: number;
  readOnly: boolean;
  onManage: () => void;
}

export function LocationCatalogPanel({ count, readOnly, onManage }: LocationCatalogPanelProps) {
  return (
    <ConsolePanel intensity="soft">
      <HeaderStrip className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <StripLabel>Locations</StripLabel>
          <Chip size="sm" color="info">
            {count}
          </Chip>
          <span className="text-caption text-muted-foreground">
            shared by equipment · supplies · reagents
          </span>
        </div>
      </HeaderStrip>

      <div className="flex items-center justify-end px-4 py-3">
        <Button
          variant="primary"
          size="sm"
          onClick={onManage}
          disabled={readOnly}
          leftIcon={<MapPin size={16} />}
        >
          Manage Locations
        </Button>
      </div>
    </ConsolePanel>
  );
}
