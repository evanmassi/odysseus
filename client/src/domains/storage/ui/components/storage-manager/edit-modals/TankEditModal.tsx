import React from 'react';

import { Save } from 'lucide-react';

import { getGridTotalPositions } from '@domains/storage';
import { useEditModalForm } from '@shared/hooks';
import { Button, Checkbox, Input } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals';

import type { TankConfiguration } from '@domains/storage';

interface TankEditModalProps {
  isOpen: boolean;
  initialTank: TankConfiguration;
  onSave: (tankId: string, updates: Partial<TankConfiguration>) => void | Promise<void>;
  onClose: () => void;
}

export function TankEditModal({ isOpen, initialTank, onSave, onClose }: TankEditModalProps) {
  const {
    formData: editedTank,
    setFormData: setEditedTank,
    createSubmitHandler,
  } = useEditModalForm(isOpen, initialTank);

  const handleSave = async () => {
    if (editedTank.name.trim()) {
      await onSave(editedTank.id, {
        name: editedTank.name.trim(),
        location: editedTank.location?.trim() || '',
        isActive: editedTank.isActive,
      });
      onClose();
    }
  };

  const handleSubmit = createSubmitHandler(async () => {
    if (editedTank.name.trim()) await handleSave();
  });

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Tank"
      icon={<TankIcon size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="tank-name"
            className="block text-sm font-medium mb-1 text-secondary-foreground"
          >
            Tank Name
          </label>
          <Input
            id="tank-name"
            type="text"
            value={editedTank.name}
            onValueChange={value => setEditedTank({ ...editedTank, name: value })}
            placeholder="Main Cryogenic Storage"
            className="text-lg font-medium"
            fullWidth
            aria-required
            aria-invalid={!editedTank.name.trim()}
          />
          {!editedTank.name.trim() && (
            <p id="tank-name-error" className="text-danger-text text-xs mt-1" role="alert">
              Tank name is required
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="tank-location"
            className="block text-sm font-medium mb-1 text-secondary-foreground"
          >
            Physical Location
          </label>
          <Input
            id="tank-location"
            type="text"
            value={editedTank.location || ''}
            onValueChange={value => setEditedTank({ ...editedTank, location: value })}
            placeholder="Lab Room 101, Building A"
            fullWidth
          />
        </div>

        <div className="bg-muted border-l-4 border-l-muted-foreground px-3 py-2 rounded-lg">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Racks:</span>
            <span className="font-semibold text-secondary-foreground">
              {editedTank.racks.length}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>Boxes:</span>
            <span className="font-semibold text-secondary-foreground">
              {editedTank.racks.reduce((total, rack) => total + rack.boxes.length, 0)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>Positions:</span>
            <span className="font-semibold text-secondary-foreground">
              {editedTank.racks
                .reduce(
                  (total, rack) =>
                    total +
                    rack.boxes.reduce(
                      (rackTotal, box) => rackTotal + getGridTotalPositions(box.gridConfig),
                      0
                    ),
                  0
                )
                .toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="tankActive"
            checked={editedTank.isActive}
            onChange={checked => setEditedTank({ ...editedTank, isActive: checked })}
          />
          <label htmlFor="tankActive" className="text-sm">
            Active (available for storage)
          </label>
        </div>
      </form>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => void handleSave()}
          disabled={!editedTank.name.trim()}
          leftIcon={<Save size={16} />}
        >
          Save Changes
        </Button>
      </div>
    </BaseModal>
  );
}
