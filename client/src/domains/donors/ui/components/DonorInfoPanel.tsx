/**
 * Donor Info Panel
 *
 * Read-only display of selected donor profile and collection history.
 */

import { BookUser, Pencil, Trash2 } from 'lucide-react';

import { Button, Chip } from '@shared/ui';
import { InfoField, InfoGroup } from '@shared/ui/components/info-display';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import { CollectionHistoryTimeline } from './CollectionHistoryTimeline';

import type { DonorWithTubeCount, DonorCollectionHistory } from '@odysseus/shared-schemas';

interface DonorInfoPanelProps {
  donor: DonorWithTubeCount;
  collectionHistory: DonorCollectionHistory[];
  onEdit: () => void;
  onDelete: () => void;
  onHistoryChange: () => void;
  isAdmin: boolean;
}

export function DonorInfoPanel({
  donor,
  collectionHistory,
  onEdit,
  onDelete,
  onHistoryChange,
  isAdmin,
}: DonorInfoPanelProps) {
  const emptyText = 'Unknown';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="pb-2 flex-shrink-0">
        <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
          <BookUser size={16} className="text-secondary-foreground" />
          Donor Information
        </h4>
      </div>

      <div className="bg-muted rounded-md px-3 py-2 mb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {!donor.isCurated && (
            <Chip size="sm" color="warning">
              Needs Review
            </Chip>
          )}
          <Chip size="sm" color="info">
            {donor.tubeCount} tube{donor.tubeCount !== 1 ? 's' : ''}
          </Chip>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
            <Button
              variant="ghost-danger"
              size="sm"
              onClick={onDelete}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 pb-4 pr-1">
          <InfoGroup title="Identifiers">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <InfoField
                label="Source ID"
                value={donor.donorSourceId}
                emptyText={emptyText}
                inline={false}
              />
              <InfoField
                label="Internal ID"
                value={donor.donorInternalId}
                emptyText={emptyText}
                inline={false}
              />
            </div>
          </InfoGroup>

          <InfoGroup title="Demographics">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <InfoField
                label="Species"
                value={donor.species}
                emptyText={emptyText}
                inline={false}
              />
              <InfoField label="Age" value={donor.age} emptyText={emptyText} inline={false} />
              <InfoField label="Sex" value={donor.sex} emptyText={emptyText} inline={false} />
              <InfoField
                label="Ethnicity"
                value={donor.ethnicity}
                emptyText={emptyText}
                inline={false}
              />
            </div>
          </InfoGroup>

          <InfoGroup title="Clinical">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <InfoField
                label="Status"
                value={donor.clinicalStatus}
                emptyText={emptyText}
                inline={false}
              />
              <InfoField
                label="Diagnosis"
                value={donor.diagnosis}
                emptyText={emptyText}
                inline={false}
              />
              <InfoField
                label="Disease Stage"
                value={donor.diseaseStage}
                emptyText={emptyText}
                inline={false}
              />
            </div>
          </InfoGroup>

          <InfoGroup title="Collection History">
            <CollectionHistoryTimeline
              history={collectionHistory}
              donorId={donor.id}
              isAdmin={isAdmin}
              onHistoryChange={onHistoryChange}
            />
          </InfoGroup>

          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: empty string should fall through to show notes section for admins */}
          {(donor.notes || isAdmin) && (
            <InfoGroup title="Notes">
              <p
                className={`text-sm ${donor.notes ? 'text-card-foreground' : 'text-card-foreground/30 italic'}`}
              >
                {donor.notes ?? emptyText}
              </p>
            </InfoGroup>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
