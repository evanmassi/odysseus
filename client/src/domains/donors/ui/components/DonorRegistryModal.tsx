/**
 * Donor Registry Modal
 *
 * Browsable donor reference with searchable table and detail panel.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { BookUser } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useDeleteDonorMutation } from '@domains/donors/hooks/useDonorMutations';
import { useDonorsQuery } from '@domains/donors/hooks/useDonorsQuery';
import { DonorService } from '@domains/donors/services/DonorService';
import { OdysseusSpinner } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { DonorEditForm } from './DonorEditForm';
import { DonorInfoPanel } from './DonorInfoPanel';
import { DonorInfoPanelEmpty } from './DonorInfoPanelEmpty';
import { DonorTable } from './DonorTable';

import type { DonorCollectionHistory } from '@odysseus/shared-schemas';

interface DonorRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDonorId?: string;
  initialIdType?: 'source' | 'internal';
}

export function DonorRegistryModal({
  isOpen,
  onClose,
  initialDonorId,
  initialIdType,
}: DonorRegistryModalProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const { data: donors = [], isLoading } = useDonorsQuery();
  const deleteMutation = useDeleteDonorMutation();

  const [selectedDonorId, setSelectedDonorId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionHistory, setCollectionHistory] = useState<DonorCollectionHistory[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const selectedDonor = useMemo(
    () => donors.find(d => d.id === selectedDonorId),
    [donors, selectedDonorId]
  );

  // Deep-link: resolve initialDonorId to a donor record
  useEffect(() => {
    if (!initialDonorId || donors.length === 0) return;

    const match = donors.find(d =>
      initialIdType === 'internal'
        ? d.donorInternalId === initialDonorId
        : d.donorSourceId === initialDonorId
    );

    if (match) {
      setSelectedDonorId(match.id);
    }
  }, [initialDonorId, initialIdType, donors]);

  // Fetch collection history when a donor is selected
  useEffect(() => {
    if (!selectedDonorId) {
      setCollectionHistory([]);
      return;
    }

    let cancelled = false;
    DonorService.getCollectionHistory(selectedDonorId)
      .then(history => {
        if (!cancelled) setCollectionHistory(history);
      })
      .catch(() => {
        if (!cancelled) setCollectionHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDonorId, historyVersion]);

  const handleSelectDonor = useCallback((id: string) => {
    setSelectedDonorId(id);
    setIsEditing(false);
    setIsCreating(false);
  }, []);

  const handleEditComplete = useCallback(() => {
    setIsEditing(false);
    setIsCreating(false);
  }, []);

  const handleAddDonor = useCallback(() => {
    setSelectedDonorId(undefined);
    setIsEditing(false);
    setIsCreating(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedDonorId) return;
    deleteMutation.mutate(selectedDonorId, {
      onSuccess: () => {
        setSelectedDonorId(undefined);
        setShowDeleteConfirm(false);
      },
    });
  }, [selectedDonorId, deleteMutation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDonorId(undefined);
      setSearchQuery('');
      setIsEditing(false);
      setIsCreating(false);
      setShowDeleteConfirm(false);
      setCollectionHistory([]);
    }
  }, [isOpen]);

  const accentBar = (
    <span
      aria-hidden
      className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
    />
  );
  const reviewCount = donors.filter(d => !d.isCurated).length;
  const locator = (
    <div className="flex items-center gap-3 font-mono">
      <div className="flex items-center gap-2.5">
        {accentBar}
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          Donors
        </span>
        <span className="phosphor-text text-data-sm text-secondary-foreground">
          {donors.length}
        </span>
      </div>
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <div className="flex items-center gap-2.5">
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          Needs Review
        </span>
        <span
          className={`phosphor-text text-data-sm ${reviewCount > 0 ? 'text-warning-text' : 'text-secondary-foreground'}`}
        >
          {reviewCount}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Donor Registry"
        subtitle="Profiles & Collection History"
        icon={<BookUser />}
        locator={locator}
        onClose={onClose}
        size="xl"
        fixedHeight
        animation="slide"
        contentClassName="p-4 h-full"
      >
        <div className="flex gap-4 h-full min-h-0">
          <div className="w-[60%] min-w-0 min-h-0 flex flex-col pb-4">
            <DonorTable
              donors={donors}
              selectedDonorId={selectedDonorId}
              onSelectDonor={handleSelectDonor}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isAdmin={isAdmin}
              onAddDonor={handleAddDonor}
              isLoading={isLoading}
            />
          </div>

          <div className="w-[40%] flex-shrink-0 flex flex-col min-h-0 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <OdysseusSpinner className="text-primary" />
              </div>
            ) : isCreating ? (
              <DonorEditForm onSubmit={handleEditComplete} onCancel={() => setIsCreating(false)} />
            ) : isEditing && selectedDonor ? (
              <DonorEditForm
                donor={selectedDonor}
                onSubmit={handleEditComplete}
                onCancel={() => setIsEditing(false)}
              />
            ) : selectedDonor ? (
              <DonorInfoPanel
                donor={selectedDonor}
                collectionHistory={collectionHistory}
                onEdit={() => setIsEditing(true)}
                onDelete={() => setShowDeleteConfirm(true)}
                onHistoryChange={() => setHistoryVersion(v => v + 1)}
                isAdmin={isAdmin}
              />
            ) : (
              <DonorInfoPanelEmpty />
            )}
          </div>
        </div>
      </BaseModal>

      {showDeleteConfirm && selectedDonor && (
        <ConfirmDialog
          isOpen
          variant="danger"
          title="Delete Donor"
          message={`Are you sure you want to delete donor ${selectedDonor.donorSourceId ?? selectedDonor.donorInternalId ?? selectedDonor.id}? This will also delete all collection history for this donor.`}
          confirmText="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  );
}
