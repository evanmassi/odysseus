/**
 * Location Modal
 *
 * Creates a lab location, optionally nested beneath an existing one.
 */

import { useState, useEffect, useRef } from 'react';

import { MapPin, Plus } from 'lucide-react';

import { useCreateLocationMutation } from '@domains/lab-management/hooks/useLocationMutations';
import { useLocationsQuery } from '@domains/lab-management/hooks/useLocationQueries';
import { buildHierarchyOptions, Button, Input, Select, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const { data: locations = [] } = useLocationsQuery();
  const createMutation = useCreateLocationMutation();
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName('');
      setDescription('');
      setParentId('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    createMutation.mutate(
      {
        name: trimmed,
        description: description.trim() || undefined,
        parentId: parentId || undefined,
      },
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

        <Select
          label="Inside (optional)"
          options={withPlaceholder('Top level', buildHierarchyOptions(locations))}
          value={parentId}
          onChange={v => setParentId(String(v ?? ''))}
          fullWidth
        />

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
