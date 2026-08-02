/**
 * Location Catalog Panel
 *
 * The locations leaf of the catalog rail. Unlike the flat vocabularies beside it, a location
 * tree needs room to show what sits inside what, so editing happens in its own modal and this
 * pane only says what the tree is for and opens it.
 */

import { MapPin } from 'lucide-react';

import { Button, SectionHeader } from '@shared/ui';

interface LocationCatalogPanelProps {
  count: number;
  readOnly: boolean;
  onManage: () => void;
}

export function LocationCatalogPanel({ count, readOnly, onManage }: LocationCatalogPanelProps) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Locations" size="sm" />

      <p className="text-body-sm text-muted-foreground">
        The places stock can sit — rooms, cold rooms, freezers, shelves — nestable three levels deep
        and shared by equipment, supplies and reagents. Renaming one updates every item stored
        there.
      </p>

      <p className="text-body-sm text-secondary-foreground">
        {count === 1 ? '1 location' : `${count} locations`} defined.
      </p>

      <Button
        variant="secondary"
        size="sm"
        onClick={onManage}
        disabled={readOnly}
        leftIcon={<MapPin size={16} />}
      >
        Manage Locations
      </Button>
    </div>
  );
}
