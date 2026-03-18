/**
 * Donor Registry Modal
 *
 * Browsable donor reference with searchable table and detail panel.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { BookUser } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useDonorsQuery } from '@domains/donors/hooks/useDonorsQuery';
import { DonorService } from '@domains/donors/services/DonorService';
import { LoadingSpinner } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

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

  const [selectedDonorId, setSelectedDonorId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDonorId(undefined);
      setSearchQuery('');
      setIsEditing(false);
      setIsCreating(false);
      setCollectionHistory([]);
    }
  }, [isOpen]);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Donor Registry"
      icon={<BookUser />}
      onClose={onClose}
      size="xl"
      fixedHeight
      animation="slide"
    >
      <div className="flex gap-4 h-full min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
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

        <div className="w-80 flex-shrink-0 flex flex-col min-h-0 overflow-hidden">
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
              onHistoryChange={() => setHistoryVersion(v => v + 1)}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
              Select a donor to view details
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
