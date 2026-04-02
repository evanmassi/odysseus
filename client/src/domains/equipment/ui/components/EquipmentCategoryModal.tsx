/**
 * Equipment Category Modal
 *
 * Creates a new equipment category or subcategory via a compact dialog.
 */

import { useState, useEffect, useRef } from 'react';

import { FolderOpen, Plus } from 'lucide-react';

import { useCreateEquipmentCategoryMutation } from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

export interface EquipmentCategoryModalProps {
  isOpen: boolean;
  parentId?: string;
  parentName?: string;
  onClose: () => void;
}

export function EquipmentCategoryModal({
  isOpen,
  parentId,
  parentName,
  onClose,
}: EquipmentCategoryModalProps) {
  const [name, setName] = useState('');
  const createMutation = useCreateEquipmentCategoryMutation();
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const isSubcategory = !!parentId;
  const title = isSubcategory ? 'Add Subcategory' : 'Add Category';

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await createMutation.mutateAsync({
        name: trimmed,
        parentId,
      });
      notifications.success(`${isSubcategory ? 'Subcategory' : 'Category'} "${trimmed}" created`);
      onClose();
    } catch {
      notifications.error(`Failed to create ${isSubcategory ? 'subcategory' : 'category'}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim() && !createMutation.isPending) {
      e.preventDefault();
      void handleSave();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      icon={<FolderOpen size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-4">
        {isSubcategory && parentName && (
          <p className="text-xs">
            <span className="text-muted-foreground/50">Category:</span>{' '}
            <span className="font-semibold text-secondary-foreground">{parentName}</span>
          </p>
        )}

        <div>
          <label
            htmlFor="categoryName"
            className="text-sm font-medium text-secondary-foreground mb-1 block"
          >
            {isSubcategory ? 'Subcategory Name' : 'Category Name'}
          </label>
          <Input
            id="categoryName"
            type="text"
            value={name}
            onValueChange={setName}
            onKeyDown={handleKeyDown}
            placeholder={isSubcategory ? 'e.g., Single Channel' : 'e.g., Pipettes'}
            maxLength={200}
            fullWidth
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!name.trim()}
            isLoading={createMutation.isPending}
            loadingText="Adding..."
            leftIcon={<Plus size={16} />}
          >
            Add
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
