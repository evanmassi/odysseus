import React, { useState } from 'react';

import { Save } from 'lucide-react';

import { BoxIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals';

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
  ) => void | Promise<void>;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSave();
  };

  return (
    <BaseModal title="Edit Box" icon={<BoxIcon size={24} />} onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="box-grid-template"
            className="block text-sm font-medium mb-1 text-odysseus-secondary"
          >
            Grid Size ({initialBox.name})
          </label>
          <select
            id="box-grid-template"
            className="input-field input-field-normal w-full"
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
                {template.rows}×{template.cols} Grid (
                {(template.rows * template.cols).toLocaleString()} positions)
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
