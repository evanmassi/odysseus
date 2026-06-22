/**
 * Rack Edit Modal
 *
 * Modal for editing a rack's name and active status.
 */

import { Save } from 'lucide-react';

import { useEditModalForm } from '@shared/hooks';
import { AlertBanner, Button, Checkbox, Input } from '@shared/ui';
import { RackIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/overlays';

import type { RackConfiguration } from '@domains/storage';

interface RackEditModalProps {
  isOpen: boolean;
  initialRack: RackConfiguration;
  tankId: string;
  onSave: (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => void | Promise<void>;
  onClose: () => void;
}

export function RackEditModal({
  isOpen,
  initialRack,
  tankId,
  onSave,
  onClose,
}: RackEditModalProps) {
  const {
    formData: editedRack,
    setFormData: setEditedRack,
    createSubmitHandler,
  } = useEditModalForm(isOpen, initialRack);

  const handleSave = async () => {
    await onSave(tankId, editedRack.id, {
      name: editedRack.name,
      isActive: editedRack.isActive,
    });
    onClose();
  };

  const handleSubmit = createSubmitHandler(async () => {
    if (editedRack.name.trim()) await handleSave();
  });

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="rack-edit-form"
        variant="primary"
        size="sm"
        disabled={!editedRack.name.trim()}
        leftIcon={<Save size={16} />}
      >
        Save Changes
      </Button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Rack"
      icon={<RackIcon size={24} />}
      onClose={onClose}
      className="max-w-sm"
      footer={footer}
    >
      <form id="rack-edit-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="rack-name"
            className="block text-body-sm font-medium mb-1 text-secondary-foreground"
          >
            System Name
          </label>
          <Input
            id="rack-name"
            type="text"
            value={editedRack.name}
            onValueChange={value => setEditedRack({ ...editedRack, name: value })}
            placeholder="Rack 1"
            fullWidth
            aria-required
          />
          <AlertBanner variant="info" spacing="none" className="mt-2 text-body-sm">
            Custom labels display alongside this name.
          </AlertBanner>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rackActive"
            checked={editedRack.isActive}
            onChange={checked => setEditedRack({ ...editedRack, isActive: checked })}
          />
          <label htmlFor="rackActive" className="text-body-sm font-medium">
            Active (visible in rack selector)
          </label>
        </div>
      </form>
    </BaseModal>
  );
}
