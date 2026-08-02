/**
 * Location Catalog Panel
 *
 * The locations leaf of the catalog rail: the tree read-only, edited in its own modal.
 */

import { MapPin } from 'lucide-react';

import { LabLocationTree } from '@domains/lab-management';
import { Button, ConsolePanel } from '@shared/ui';
import {
  headerSurface,
  HEADER_TOP_EDGE,
} from '@shared/ui/primitives/console-panel/consoleHeaderSurface';

import type { LabLocation } from '@odysseus/shared-schemas';

interface LocationCatalogPanelProps {
  locations: LabLocation[];
  readOnly: boolean;
  onManage: () => void;
}

export function LocationCatalogPanel({ locations, readOnly, onManage }: LocationCatalogPanelProps) {
  return (
    <ConsolePanel intensity="soft">
      <div
        className="relative flex items-center gap-3 px-4 py-3"
        style={{ background: headerSurface(true), boxShadow: HEADER_TOP_EDGE }}
      >
        <span className="min-w-0 truncate type-label text-label-2xs tracking-label-wide text-foreground/40">
          used by equipment · supplies · reagents
        </span>
        <div className="flex-1" />
        <Button
          variant="primary"
          size="sm"
          className="flex-shrink-0"
          onClick={onManage}
          disabled={readOnly}
          leftIcon={<MapPin size={14} />}
        >
          Manage Locations
        </Button>
      </div>

      <div className="px-4 py-3">
        <LabLocationTree
          locations={locations}
          treeId="lab-location-catalog"
          emptyMessage="No locations yet"
        />
      </div>
    </ConsolePanel>
  );
}
