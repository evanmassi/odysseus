import React, { useState } from 'react';

import { Save, X } from 'lucide-react';

import type { RackConfiguration } from '@domains/storage';

interface RackEditModalProps {
  initialRack: RackConfiguration;
  tankId: string;
  onSave: (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => void | Promise<void>;
  onClose: () => void;
}

export function RackEditModal({ initialRack, tankId, onSave, onClose }: RackEditModalProps) {
  const [editedRack, setEditedRack] = useState(initialRack);

  const handleSave = async () => {
    await onSave(tankId, editedRack.id, {
      name: editedRack.name,
      location: editedRack.location,
      description: editedRack.description,
      isActive: editedRack.isActive,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
      role="presentation"
      onKeyDown={e => {
        if (e.key === 'Enter' && editedRack.name.trim()) {
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
        aria-labelledby="rack-edit-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="rack-edit-title" className="text-lg font-bold">
            Edit Rack
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="rack-name" className="block text-sm font-medium mb-2">
              Rack Name
            </label>
            <input
              id="rack-name"
              type="text"
              className="input w-full"
              value={editedRack.name}
              onChange={e => setEditedRack({ ...editedRack, name: e.target.value })}
              placeholder="Rack 1"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="rack-description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="rack-description"
              className="input w-full resize-none"
              rows={3}
              value={editedRack.description ?? ''}
              onChange={e => setEditedRack({ ...editedRack, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rackActive"
              checked={editedRack.isActive}
              onChange={e => setEditedRack({ ...editedRack, isActive: e.target.checked })}
            />
            <label htmlFor="rackActive" className="text-sm font-medium">
              Active (visible in rack selector)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
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
  );
}
