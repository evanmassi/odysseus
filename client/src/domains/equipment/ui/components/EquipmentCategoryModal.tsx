/**
 * Equipment Category Modal
 *
 * Creates or renames an equipment category or subcategory via a compact dialog.
 */

import { useState, useEffect, useRef } from 'react';

import { FolderOpen, Plus, SquarePen } from 'lucide-react';

import {
  useCreateEquipmentCategoryMutation,
  useUpdateEquipmentCategoryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { EquipmentCategory } from '@odysseus/shared-schemas';

interface EquipmentCategoryModalProps {
  isOpen: boolean;
  parentId?: string;
  parentName?: string;
  category?: EquipmentCategory;
  onClose: () => void;
}

export function EquipmentCategoryModal({
  isOpen,
  parentId,
  parentName,
  category,
  onClose,
}: EquipmentCategoryModalProps) {
  const [name, setName] = useState('');
  const createMutation = useCreateEquipmentCategoryMutation();
  const updateMutation = useUpdateEquipmentCategoryMutation();
  const prevIsOpenRef = useRef(isOpen);

  const isEditing = !!category;
  const isSubcategory = !!parentId;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName(category?.name ?? '');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, category?.name]);

  const title = isEditing ? 'Rename Category' : isSubcategory ? 'Add Subcategory' : 'Add Category';

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: category.id, data: { name: trimmed } });
        notifications.success(`Renamed to "${trimmed}"`);
      } else {
        await createMutation.mutateAsync({ name: trimmed, parentId });
        notifications.success(`${isSubcategory ? 'Subcategory' : 'Category'} "${trimmed}" created`);
      }
      onClose();
    } catch {
      notifications.error(isEditing ? 'Failed to rename' : 'Failed to create');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim() && !isPending) {
      e.preventDefault();
      void handleSave();
    }
  };

  const hasChanges = isEditing ? name.trim() !== category.name : !!name.trim();

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      icon={isEditing ? <SquarePen size={24} /> : <FolderOpen size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-4">
        {isSubcategory && parentName && !isEditing && (
          <p className="text-caption">
            <span className="text-muted-foreground/50">Category:</span>{' '}
            <span className="font-semibold text-secondary-foreground">{parentName}</span>
          </p>
        )}

        <div>
          <label
            htmlFor="categoryName"
            className="text-body-sm font-medium text-secondary-foreground mb-1 block"
          >
            {isSubcategory && !isEditing ? 'Subcategory Name' : 'Category Name'}
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
            disabled={!hasChanges}
            isLoading={isPending}
            loadingText={isEditing ? 'Saving...' : 'Adding...'}
            leftIcon={isEditing ? <SquarePen size={16} /> : <Plus size={16} />}
          >
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
