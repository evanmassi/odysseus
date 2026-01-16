import React, { useState, useEffect } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Save, Tag } from 'lucide-react';

import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals';

import type { LabConfiguration } from '@domains/storage';

interface CustomLabelEditModalProps {
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

export function CustomLabelEditModal({
  isOpen,
  resourceInfo,
  currentLab,
  onSave,
  onClose,
}: CustomLabelEditModalProps) {
  const [label, setLabel] = useState(resourceInfo.initialLabel ?? '');

  // Reset form state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setLabel(resourceInfo.initialLabel ?? '');
    }
  }, [isOpen, resourceInfo.initialLabel]);

  const tank = currentLab.equipment.tanks.find(t => t.id === resourceInfo.tankId);
  const rack = tank?.racks.find(r => r.id === resourceInfo.rackId);
  const box = rack?.boxes.find(b => b.id === resourceInfo.boxId);

  const genericName = resourceInfo.type === 'rack' ? (rack?.name ?? '') : (box?.name ?? '');

  const previewName = formatResourceDisplayName(genericName, label);

  const handleSave = async () => {
    await onSave(
      resourceInfo.type,
      resourceInfo.tankId,
      resourceInfo.rackId,
      resourceInfo.boxId,
      label
    );
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSave();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Custom Label"
      icon={<Tag size={24} />}
      onClose={onClose}
      className="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Generic Name (Read-only) */}
        <div>
          <div className="block text-sm font-medium mb-1 text-secondary-foreground">
            System Name
          </div>
          <div className="px-3 py-2 bg-muted rounded text-secondary-foreground font-medium">
            {genericName}
          </div>
        </div>

        {/* Custom Label Input */}
        <div>
          <label
            htmlFor="custom-label-input"
            className="block text-sm font-medium mb-1 text-secondary-foreground"
          >
            Custom Label (optional)
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
            <p className="text-xs text-muted-foreground">Leave blank to remove custom label.</p>
            <p className="text-xs text-muted-foreground">{label.length}/50</p>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Preview:</span>
          <span className="font-semibold text-secondary-foreground">{previewName}</span>
        </div>
      </form>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void handleSave()} leftIcon={<Save size={16} />}>
          Save Label
        </Button>
      </div>
    </BaseModal>
  );
}
