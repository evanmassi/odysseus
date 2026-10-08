import { BookUser, SquarePen, Trash2 } from 'lucide-react';

import { useDemoItemLock } from '@shared/hooks/useDemoItemLock';
import {
  Button,
  Chip,
  DemoLockIndicator,
  DetailRow,
  FramelessPanel,
  STAT_STRIP,
  StatCell,
  Subsection,
} from '@shared/ui';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { CollectionHistoryTimeline } from './CollectionHistoryTimeline';

import type { DonorWithTubeCount, DonorCollectionHistory } from '@odysseus/shared-schemas';

interface DonorInfoPanelProps {
  donor: DonorWithTubeCount;
  collectionHistory: DonorCollectionHistory[];
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}

export function DonorInfoPanel({
  donor,
  collectionHistory,
  onEdit,
  onDelete,
  isAdmin,
}: DonorInfoPanelProps) {
  const isDemoLockedDonor = useDemoItemLock();
  const isLocked = isDemoLockedDonor(donor);
  const collectionCount = collectionHistory.length;
  const lastCollectionDate = collectionHistory
    .map(e => e.collectionDate)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.localeCompare(a))[0];
  const lastDateStr = lastCollectionDate ? formatDateForDisplay(lastCollectionDate) : undefined;
  const hasDemographics = [donor.species, donor.age, donor.sex, donor.ethnicity].some(Boolean);
  const hasClinical = [donor.clinicalStatus, donor.diagnosis, donor.diseaseStage].some(Boolean);

  return (
    <FramelessPanel
      icon={<BookUser className="h-4 w-4" />}
      title="Donor Information"
      footer={
        isAdmin && (
          <div className="flex items-center gap-2">
            {isLocked ? (
              <DemoLockIndicator />
            ) : (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={onDelete}
              >
                Remove
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              leftIcon={<SquarePen className="h-4 w-4" />}
              onClick={onEdit}
            >
              Edit
            </Button>
          </div>
        )
      }
    >
      <div className={`${STAT_STRIP} -ml-3 pb-6`}>
        <StatCell size="sm" label="Collections" value={collectionCount} />
        <StatCell size="sm" label="Last Collection" value={lastDateStr ?? 'None yet'} />
      </div>

      {!donor.isCurated && (
        <div className="flex items-center gap-2">
          <Chip size="sm" color="warning">
            Needs Review
          </Chip>
        </div>
      )}

      <Subsection title="Identifiers" isCompact>
        <DetailRow label="Source ID" value={donor.donorSourceId} />
        <DetailRow label="Internal ID" value={donor.donorInternalId} />
      </Subsection>

      {hasDemographics && (
        <Subsection title="Demographics" isCompact>
          <DetailRow label="Species" value={donor.species} />
          <DetailRow label="Age" value={donor.age} />
          <DetailRow label="Sex" value={donor.sex} />
          <DetailRow label="Ethnicity" value={donor.ethnicity} />
        </Subsection>
      )}

      {hasClinical && (
        <Subsection title="Clinical" isCompact>
          <DetailRow label="Status" value={donor.clinicalStatus} />
          <DetailRow label="Diagnosis" value={donor.diagnosis} />
          <DetailRow label="Disease Stage" value={donor.diseaseStage} />
        </Subsection>
      )}

      <Subsection title="Collection History" isCompact>
        <CollectionHistoryTimeline
          history={collectionHistory}
          donorId={donor.id}
          isAdmin={isAdmin}
          isDeleteLocked={isLocked}
        />
      </Subsection>

      {(Boolean(donor.notes) || isAdmin) && (
        <Subsection title="Notes" isCompact>
          {donor.notes ? (
            <div className="text-body leading-relaxed text-card-foreground/85">{donor.notes}</div>
          ) : (
            <div className="text-body-sm italic text-card-foreground/30">Unknown</div>
          )}
        </Subsection>
      )}
    </FramelessPanel>
  );
}
