import { BookUser, SquarePen, Trash2 } from 'lucide-react';

import { useDemoItemLock } from '@shared/hooks/useDemoItemLock';
import {
  Button,
  Chip,
  DemoLockIndicator,
  DetailRow,
  HeaderStrip,
  NubDivider,
  PanelHeader,
  SectionHeader,
  StripLabel,
} from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
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
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0">
        <PanelHeader icon={<BookUser className="h-4 w-4" />} title="Donor Information" />
      </div>

      <HeaderStrip className="px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <StripLabel>Collections</StripLabel>
          <span className="min-w-0 truncate font-mono text-data-sm tracking-[0.06em] text-foreground">
            {collectionCount === 0 ? (
              <span className="text-muted-foreground">None yet</span>
            ) : (
              <>
                {collectionCount}
                {lastDateStr && (
                  <span className="text-muted-foreground"> · last {lastDateStr}</span>
                )}
              </>
            )}
          </span>
        </div>
      </HeaderStrip>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {!donor.isCurated && (
            <div className="flex items-center gap-2">
              <Chip size="sm" color="warning">
                Needs Review
              </Chip>
            </div>
          )}

          <div>
            <SectionHeader title="Identifiers" size="sm" />
            <div>
              <DetailRow label="Source ID" value={donor.donorSourceId} />
              <DetailRow label="Internal ID" value={donor.donorInternalId} />
            </div>
          </div>

          {hasDemographics && (
            <div>
              <SectionHeader title="Demographics" size="sm" />
              <div>
                <DetailRow label="Species" value={donor.species} />
                <DetailRow label="Age" value={donor.age} />
                <DetailRow label="Sex" value={donor.sex} />
                <DetailRow label="Ethnicity" value={donor.ethnicity} />
              </div>
            </div>
          )}

          {hasClinical && (
            <div>
              <SectionHeader title="Clinical" size="sm" />
              <div>
                <DetailRow label="Status" value={donor.clinicalStatus} />
                <DetailRow label="Diagnosis" value={donor.diagnosis} />
                <DetailRow label="Disease Stage" value={donor.diseaseStage} />
              </div>
            </div>
          )}

          <div>
            <SectionHeader title="Collection History" size="sm" />
            <CollectionHistoryTimeline
              history={collectionHistory}
              donorId={donor.id}
              isAdmin={isAdmin}
              isDeleteLocked={isLocked}
            />
          </div>

          {(Boolean(donor.notes) || isAdmin) && (
            <div>
              <SectionHeader title="Notes" size="sm" />
              {donor.notes ? (
                <div className="text-body leading-relaxed text-card-foreground/85">
                  {donor.notes}
                </div>
              ) : (
                <div className="text-body-sm italic text-card-foreground/30">Unknown</div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {isAdmin && (
        <div className="relative flex-shrink-0 border-t border-line-faint bg-card px-4 py-3 dark:bg-shade/15">
          <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
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
        </div>
      )}
    </ConsolePanel>
  );
}
