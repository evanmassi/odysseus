/**
 * Storage Rename Modal
 *
 * Modal for setting or removing a custom display name on a rack or box.
 */

import { formatStorageDisplayName } from '@odysseus/shared-schemas';
import { Save, Tag } from 'lucide-react';

import { useEditModalForm } from '@shared/hooks';
import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';

import type { LabConfiguration } from '@odysseus/shared-schemas';

interface StorageRenameModalProps {
  isOpen: boolean;
  resourceInfo: {
    type: 'rack' | 'box';
    tankId: string;
    rackId: string;
    boxId?: string;
    initialLabel?: string;
  };
  currentLab: LabConfiguration;
  onSave: (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    label: string
  ) => void | Promise<void>;
  onClose: () => void;
}

export function StorageRenameModal({
  isOpen,
  resourceInfo,
  currentLab,
  onSave,
  onClose,
}: StorageRenameModalProps) {
  const {
    formData: label,
    setFormData: setLabel,
    createSubmitHandler,
  } = useEditModalForm(isOpen, resourceInfo.initialLabel ?? '');

  const tank = currentLab.equipment.tanks.find(t => t.id === resourceInfo.tankId);
  const rack = tank?.racks.find(r => r.id === resourceInfo.rackId);
  const box = rack?.boxes.find(b => b.id === resourceInfo.boxId);

  const isRack = resourceInfo.type === 'rack';
  const genericName = isRack ? (rack?.name ?? '') : (box?.name ?? '');

  const previewName = formatStorageDisplayName(genericName, label);

  const handleSave = async () => {
    // The mutation's onSuccess closes the modal, so a failed save keeps it open with edits intact.
    await onSave(
      resourceInfo.type,
      resourceInfo.tankId,
      resourceInfo.rackId,
      resourceInfo.boxId,
      label
    );
  };

  const handleSubmit = createSubmitHandler(handleSave);

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="storage-rename-form"
        variant="primary"
        size="sm"
        leftIcon={<Save size={16} />}
      >
        Save Changes
      </Button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      title={isRack ? 'Rename Rack' : 'Rename Box'}
      icon={<Tag size={24} />}
      onClose={onClose}
      className="max-w-sm"
      footer={footer}
    >
      <form id="storage-rename-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="block text-body-sm font-medium mb-1 text-secondary-foreground">
            System Name
          </div>
          <div className="px-3 py-2 bg-muted rounded text-secondary-foreground font-medium">
            {genericName}
          </div>
        </div>

        <div>
          <label
            htmlFor="custom-label-input"
            className="block text-body-sm font-medium mb-1 text-secondary-foreground"
          >
            Display Name
          </label>
          <Input
            id="custom-label-input"
            type="text"
            value={label}
            onValueChange={setLabel}
            placeholder="e.g., My Lab Samples"
            maxLength={50}
            fullWidth
          />
          <div className="flex justify-between mt-1">
            <p className="text-caption text-muted-foreground">Leave blank to use system name.</p>
            <p className="text-caption text-muted-foreground">{label.length}/50</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <span>Preview:</span>
          <span className="font-semibold text-secondary-foreground">{previewName}</span>
        </div>
      </form>
    </BaseModal>
  );
}
