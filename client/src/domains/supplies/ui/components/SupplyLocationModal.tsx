/**
 * Supply Location Modal
 *
 * Creates or edits a named storage location where supplies are kept.
 */

import { useState, useEffect, useRef } from 'react';

import { MapPin, Plus, SquarePen } from 'lucide-react';

import {
  useCreateSupplyLocationMutation,
  useUpdateSupplyLocationMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Input } from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { SupplyLocation } from '@odysseus/shared-schemas';

interface SupplyLocationModalProps {
  isOpen: boolean;
  location?: SupplyLocation;
  onClose: () => void;
}

export function SupplyLocationModal({ isOpen, location, onClose }: SupplyLocationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateSupplyLocationMutation();
  const updateMutation = useUpdateSupplyLocationMutation();
  const prevIsOpenRef = useRef(isOpen);

  const isEditing = !!location;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName(location?.name ?? '');
      setDescription(location?.description ?? '');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, location?.name, location?.description]);

  const title = isEditing ? 'Edit Location' : 'Add Location';

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEditing) {
      updateMutation.mutate(
        { id: location.id, data: { name: trimmed, description: description.trim() || undefined } },
        {
          onSuccess: () => {
            notifications.success(`Location updated`);
            onClose();
          },
        }
      );
    } else {
      createMutation.mutate(
        { name: trimmed, description: description.trim() || undefined },
        {
          onSuccess: () => {
            notifications.success(`Location "${trimmed}" created`);
            onClose();
          },
        }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim() && !isPending) {
      e.preventDefault();
      handleSave();
    }
  };

  const hasChanges = isEditing
    ? name.trim() !== location.name || description.trim() !== (location.description ?? '')
    : !!name.trim();

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      icon={isEditing ? <SquarePen size={24} /> : <MapPin size={24} />}
      onClose={onClose}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="locationName" className={FIELD_LABEL_STANDARD}>
            Location Name
          </label>
          <Input
            id="locationName"
            type="text"
            value={name}
            onValueChange={setName}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Back Supply Room"
            maxLength={200}
            fullWidth
          />
        </div>

        <div>
          <label htmlFor="locationDescription" className={FIELD_LABEL_STANDARD}>
            Description
          </label>
          <Input
            id="locationDescription"
            type="text"
            value={description}
            onValueChange={setDescription}
            placeholder="Optional details about this location"
            maxLength={500}
            fullWidth
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!hasChanges}
            isLoading={isPending}
            loadingText={isEditing ? 'Saving...' : 'Adding...'}
            leftIcon={isEditing ? <SquarePen size={16} /> : <Plus size={16} />}
          >
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
