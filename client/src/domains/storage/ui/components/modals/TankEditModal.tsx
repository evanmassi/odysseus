import React, { useState, useEffect } from 'react';

import { Save } from 'lucide-react';

import { getGridTotalPositions } from '@domains/storage';
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
  const [editedTank, setEditedTank] = useState(initialTank);

  // Reset form state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEditedTank(initialTank);
    }
  }, [isOpen, initialTank]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedTank.name.trim()) {
      void handleSave();
    }
  };

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
          <input
            id="tank-name"
            type="text"
            className="input w-full text-lg font-medium"
            value={editedTank.name}
            onChange={e => setEditedTank({ ...editedTank, name: e.target.value })}
            placeholder="Main Cryogenic Storage"
            required
            aria-required="true"
            aria-invalid={!editedTank.name.trim()}
          />
          {!editedTank.name.trim() && (
            <p id="tank-name-error" className="text-red-500 text-xs mt-1" role="alert">
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
          <input
            id="tank-location"
            type="text"
            className="input w-full"
            value={editedTank.location || ''}
            onChange={e => setEditedTank({ ...editedTank, location: e.target.value })}
            placeholder="Lab Room 101, Building A"
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
          <input
            type="checkbox"
            id="tankActive"
            checked={editedTank.isActive}
            onChange={e => setEditedTank({ ...editedTank, isActive: e.target.checked })}
            className="w-4 h-4 border-border rounded focus:outline-none focus:ring-2 focus:ring-action-focus focus:ring-offset-0"
            style={{ accentColor: 'var(--color-action-default)' }}
          />
          <label htmlFor="tankActive" className="text-sm">
            Active (available for storage)
          </label>
        </div>
      </form>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!editedTank.name.trim()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </BaseModal>
  );
}
