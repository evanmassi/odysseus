import React, { useMemo } from 'react';

import { Save } from 'lucide-react';

import { useEditModalForm } from '@shared/hooks';
import { Button, Select } from '@shared/ui';
import { BoxIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals';

import type { BoxConfiguration, GridConfiguration } from '@domains/storage';

interface BoxEditModalProps {
  isOpen: boolean;
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
  isOpen,
  initialBox,
  tankId,
  rackId,
  gridTemplates,
  onSave,
  onClose,
}: BoxEditModalProps) {
  const {
    formData: selectedGridConfig,
    setFormData: setSelectedGridConfig,
    createSubmitHandler,
  } = useEditModalForm<GridConfiguration>(isOpen, initialBox.gridConfig);

  // Convert grid templates to Select options
  const gridOptions = useMemo(
    () =>
      gridTemplates.map(template => ({
        value: `${template.rows}x${template.cols}`,
        label: `${template.rows}×${template.cols} Grid (${(template.rows * template.cols).toLocaleString()} positions)`,
      })),
    [gridTemplates]
  );

  const handleGridChange = (value: string | number | (string | number)[] | null) => {
    if (typeof value !== 'string') return;
    const [rows, cols] = value.split('x').map(Number);
    const template = gridTemplates.find(t => t.rows === rows && t.cols === cols);
    if (template) setSelectedGridConfig(template);
  };

  const handleSave = async () => {
    await onSave(tankId, rackId, initialBox.id, selectedGridConfig);
    onClose();
  };

  const handleSubmit = createSubmitHandler(handleSave);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Box"
      icon={<BoxIcon size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Select
            label={`Grid Size (${initialBox.name})`}
            options={gridOptions}
            value={`${selectedGridConfig.rows}x${selectedGridConfig.cols}`}
            onChange={handleGridChange}
            aria-label="Select grid template for box"
            fullWidth
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Save size={16} />}>
            Save Changes
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
