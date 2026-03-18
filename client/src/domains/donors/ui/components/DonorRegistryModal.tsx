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
import { LoadingSpinner } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { DonorEditForm } from './DonorEditForm';
import { DonorInfoPanel } from './DonorInfoPanel';
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

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Donor Registry"
        icon={<BookUser />}
        onClose={onClose}
        size="xl"
        fixedHeight
        animation="slide"
        contentClassName="p-4 h-full"
      >
        <div className="flex gap-4 h-full min-h-0 overflow-hidden">
          <div className="w-[60%] min-w-0 flex flex-col overflow-hidden">
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

          <div className="w-[40%] flex-shrink-0 flex flex-col min-h-0 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
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
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 mb-3 rounded-full bg-muted flex items-center justify-center">
                  <BookUser className="w-6 h-6 text-card-foreground/30" />
                </div>
                <p className="text-card-foreground/40 text-sm">Select a donor to view details</p>
              </div>
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
