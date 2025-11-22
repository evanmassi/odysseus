import React, { useState } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Save, X } from 'lucide-react';

import type { LabConfiguration } from '@domains/storage';

interface CustomLabelEditModalProps {
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
  ) => Promise<void>;
  onClose: () => void;
}

export function CustomLabelEditModal({
  resourceInfo,
  currentLab,
  onSave,
  onClose,
}: CustomLabelEditModalProps) {
  const [label, setLabel] = useState(resourceInfo.initialLabel ?? '');

  const tank = currentLab.equipment.tanks.find(t => t.id === resourceInfo.tankId);
  const rack = tank?.racks.find(r => r.id === resourceInfo.rackId);
  const box = rack?.boxes.find(b => b.id === resourceInfo.boxId);

  const genericName = resourceInfo.type === 'rack' ? rack?.name ?? '' : box?.name ?? '';

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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
      role="presentation"
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg p-6 w-96 shadow-xl"
        role="dialog"
        aria-labelledby="label-edit-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="label-edit-title" className="text-lg font-bold">
            Edit Custom Label
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Generic Name (Read-only) */}
          <div>
            <div className="block text-sm font-medium mb-2 text-gray-700">
              Generic Name (System)
            </div>
            <div className="px-3 py-2 bg-gray-100 rounded text-gray-700 font-medium">
              {genericName}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Generic name is visible to all users and cannot be changed here
            </p>
          </div>

          {/* Custom Label Input */}
          <div>
            <label
              htmlFor="custom-label-input"
              className="block text-sm font-medium mb-2 text-gray-700"
            >
              Your Custom Label (Optional)
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
            <p className="text-xs text-gray-500 mt-1">
              {label.length}/50 characters · Leave blank to remove custom label
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-3 rounded">
            <div className="block text-sm font-medium mb-1 text-blue-700">Preview</div>
            <div className="text-sm font-medium text-blue-900">{previewName}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button onClick={() => void handleSave()} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            Save Label
          </button>
        </div>
      </div>
    </div>
  );
}
