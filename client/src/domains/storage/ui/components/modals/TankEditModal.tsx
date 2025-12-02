import React, { useState } from 'react';

import { Save, X } from 'lucide-react';

import { getGridTotalPositions } from '@domains/storage';
import { TankIcon } from '@shared/ui/components/icons';

import type { TankConfiguration } from '@domains/storage';

interface TankEditModalProps {
  initialTank: TankConfiguration;
  onSave: (tankId: string, updates: Partial<TankConfiguration>) => void | Promise<void>;
  onClose: () => void;
}

export function TankEditModal({ initialTank, onSave, onClose }: TankEditModalProps) {
  const [editedTank, setEditedTank] = useState(initialTank);

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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
      role="presentation"
      onKeyDown={e => {
        if (e.key === 'Enter' && editedTank.name.trim()) {
          e.preventDefault();
          void handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg p-6 w-[480px] shadow-xl"
        role="dialog"
        aria-labelledby="tank-edit-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TankIcon className="text-odysseus-blue" size={22} />
            <h3 id="tank-edit-title" className="text-lg font-bold">
              Edit Tank Configuration
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="tank-name" className="block text-sm font-semibold mb-2 text-gray-700">
              Tank Name *
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
              className="block text-sm font-semibold mb-2 text-gray-700"
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

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Tank Status</h4>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="tankActive"
                checked={editedTank.isActive}
                onChange={e => setEditedTank({ ...editedTank, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="tankActive" className="text-sm font-medium">
                Active (tank is available for storage)
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Inactive tanks are hidden from selectors but data is preserved
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-700 mb-1">Tank Statistics</h4>
            <div className="text-sm text-blue-600 space-y-1">
              <p>• {editedTank.racks.length} racks configured</p>
              <p>
                • {editedTank.racks.reduce((total, rack) => total + rack.boxes.length, 0)} storage
                boxes
              </p>
              <p>
                •{' '}
                {editedTank.racks.reduce(
                  (total, rack) =>
                    total +
                    rack.boxes.reduce(
                      (rackTotal, box) => rackTotal + getGridTotalPositions(box.gridConfig),
                      0
                    ),
                  0
                )}{' '}
                total positions
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!editedTank.name.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
