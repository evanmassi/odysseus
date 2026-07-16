/**
 * Supply Location Modal
 *
 * Creates a named storage location where supplies are kept.
 */

import { useState, useEffect, useRef } from 'react';

import { MapPin, Plus } from 'lucide-react';

import { useCreateSupplyLocationMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Input } from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

interface SupplyLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupplyLocationModal({ isOpen, onClose }: SupplyLocationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateSupplyLocationMutation();
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName('');
      setDescription('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    createMutation.mutate(
      { name: trimmed, description: description.trim() || undefined },
      {
        onSuccess: () => {
          notifications.success(`Location "${trimmed}" created`);
          onClose();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim() && !createMutation.isPending) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Add Location"
      icon={<MapPin size={24} />}
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
            disabled={!name.trim()}
            isLoading={createMutation.isPending}
            loadingText="Adding..."
            leftIcon={<Plus size={16} />}
          >
            Add
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
