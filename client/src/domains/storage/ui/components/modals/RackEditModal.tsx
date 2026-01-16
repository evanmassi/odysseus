import React, { useState, useEffect } from 'react';

import { Save } from 'lucide-react';

import { Button } from '@shared/ui';
import { RackIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals';

import type { RackConfiguration } from '@domains/storage';

interface RackEditModalProps {
  isOpen: boolean;
  initialRack: RackConfiguration;
  tankId: string;
  onSave: (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => void | Promise<void>;
  onClose: () => void;
}

export function RackEditModal({
  isOpen,
  initialRack,
  tankId,
  onSave,
  onClose,
}: RackEditModalProps) {
  const [editedRack, setEditedRack] = useState(initialRack);

  // Reset form state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEditedRack(initialRack);
    }
  }, [isOpen, initialRack]);

  const handleSave = async () => {
    await onSave(tankId, editedRack.id, {
      name: editedRack.name,
      isActive: editedRack.isActive,
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedRack.name.trim()) {
      void handleSave();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Rack"
      icon={<RackIcon size={24} />}
      onClose={onClose}
      className="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="rack-name"
            className="block text-sm font-medium mb-1 text-secondary-foreground"
          >
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rackActive"
            checked={editedRack.isActive}
            onChange={e => setEditedRack({ ...editedRack, isActive: e.target.checked })}
            className="w-4 h-4 border-border rounded focus:outline-none focus:ring-2 focus:ring-action-focus focus:ring-offset-0"
            style={{ accentColor: 'var(--color-action-default)' }}
          />
          <label htmlFor="rackActive" className="text-sm font-medium">
            Active (visible in rack selector)
          </label>
        </div>
      </form>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void handleSave()} leftIcon={<Save size={16} />}>
          Save Changes
        </Button>
      </div>
    </BaseModal>
  );
}
