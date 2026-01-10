import React, { useState, useEffect } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Save, Tag } from 'lucide-react';

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
          <div className="block text-sm font-medium mb-1 text-odysseus-secondary">System Name</div>
          <div className="px-3 py-2 bg-gray-100 rounded text-gray-700 font-medium">
            {genericName}
          </div>
        </div>

        {/* Custom Label Input */}
        <div>
          <label
            htmlFor="custom-label-input"
            className="block text-sm font-medium mb-1 text-odysseus-secondary"
          >
            Custom Label (optional)
          </label>
          <input
            id="custom-label-input"
            type="text"
            className="input w-full"
            value={label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
            placeholder="e.g., My Lab Samples"
            maxLength={50}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">Leave blank to remove custom label.</p>
            <p className="text-xs text-gray-500">{label.length}/50</p>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <span>Preview:</span>
          <span className="font-semibold text-slate-700">{previewName}</span>
        </div>
      </form>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          Save Label
        </button>
      </div>
    </BaseModal>
  );
}
