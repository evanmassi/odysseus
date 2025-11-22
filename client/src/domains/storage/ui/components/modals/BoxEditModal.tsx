import React, { useState } from 'react';

import { Save } from 'lucide-react';

import type { BoxConfiguration, GridConfiguration } from '@domains/storage';

interface BoxEditModalProps {
  initialBox: BoxConfiguration;
  tankId: string;
  rackId: string;
  gridTemplates: readonly GridConfiguration[];
  onSave: (
    tankId: string,
    rackId: string,
    boxId: string,
    gridConfig: GridConfiguration
  ) => Promise<void>;
  onClose: () => void;
}

export function BoxEditModal({
  initialBox,
  tankId,
  rackId,
  gridTemplates,
  onSave,
  onClose,
}: BoxEditModalProps) {
  const [selectedGridConfig, setSelectedGridConfig] = useState<GridConfiguration>(
    initialBox.gridConfig
  );

  const handleSave = async () => {
    await onSave(tankId, rackId, initialBox.id, selectedGridConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
      role="presentation"
      onKeyDown={e => {
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
        className="bg-white rounded-lg p-6 max-w-md w-full m-4"
        role="dialog"
        aria-labelledby="box-edit-title"
        aria-modal="true"
      >
        <h3 id="box-edit-title" className="text-lg font-semibold mb-4">
          Configure {initialBox.name} Grid Size
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="box-grid-template" className="block text-sm font-medium mb-2">
              Select Grid Template
            </label>
            <select
              id="box-grid-template"
              className="w-full border rounded-lg px-3 py-2"
              value={`${selectedGridConfig.rows}x${selectedGridConfig.cols}`}
              onChange={e => {
                const [rows, cols] = e.target.value.split('x').map(Number);
                const template = gridTemplates.find(t => t.rows === rows && t.cols === cols);
                if (template) setSelectedGridConfig(template);
              }}
              aria-label="Select grid template for box"
            >
              {gridTemplates.map(template => (
                <option
                  key={`${template.rows}x${template.cols}`}
                  value={`${template.rows}x${template.cols}`}
                >
                  {template.rows}×{template.cols} Grid
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button onClick={() => void handleSave()} className="btn-primary flex items-center gap-2">
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
