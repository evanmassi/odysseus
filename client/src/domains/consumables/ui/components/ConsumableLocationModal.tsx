/**
 * Consumable Location Modal
 *
 * Creates or edits a named storage location where consumables are kept.
 */

import { useState, useEffect, useRef } from 'react';

import { MapPin, Plus, SquarePen } from 'lucide-react';

import {
  useCreateConsumableLocationMutation,
  useUpdateConsumableLocationMutation,
} from '@domains/consumables/hooks/useConsumableMutations';
import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { ConsumableLocation } from '@odysseus/shared-schemas';

export interface ConsumableLocationModalProps {
  isOpen: boolean;
  location?: ConsumableLocation;
  onClose: () => void;
}

export function ConsumableLocationModal({
  isOpen,
  location,
  onClose,
}: ConsumableLocationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateConsumableLocationMutation();
  const updateMutation = useUpdateConsumableLocationMutation();
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

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: location.id,
          data: { name: trimmed, description: description.trim() || undefined },
        });
        notifications.success(`Location updated`);
      } else {
        await createMutation.mutateAsync({
          name: trimmed,
          description: description.trim() || undefined,
        });
        notifications.success(`Location "${trimmed}" created`);
      }
      onClose();
    } catch {
      notifications.error(isEditing ? 'Failed to update location' : 'Failed to create location');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim() && !isPending) {
      e.preventDefault();
      void handleSave();
    }
  };

  const hasChanges = isEditing
    ? name.trim() !== location.name || (description.trim() ?? '') !== (location.description ?? '')
    : !!name.trim();

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      icon={isEditing ? <SquarePen size={24} /> : <MapPin size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="locationName"
            className="text-sm font-medium text-secondary-foreground mb-1 block"
          >
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
          <label
            htmlFor="locationDescription"
            className="text-sm font-medium text-secondary-foreground mb-1 block"
          >
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
