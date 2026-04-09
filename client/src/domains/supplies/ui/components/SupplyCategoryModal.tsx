/**
 * Supply Category Modal
 *
 * Creates or renames a supply category or subcategory via a compact dialog.
 */

import { useState, useEffect, useRef } from 'react';

import { FolderOpen, Plus, SquarePen } from 'lucide-react';

import {
  useCreateSupplyCategoryMutation,
  useUpdateSupplyCategoryMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { SupplyCategory } from '@odysseus/shared-schemas';

export interface SupplyCategoryModalProps {
  isOpen: boolean;
  parentId?: string;
  parentName?: string;
  category?: SupplyCategory;
  onClose: () => void;
}

export function SupplyCategoryModal({
  isOpen,
  parentId,
  parentName,
  category,
  onClose,
}: SupplyCategoryModalProps) {
  const [name, setName] = useState('');
  const createMutation = useCreateSupplyCategoryMutation();
  const updateMutation = useUpdateSupplyCategoryMutation();
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
            {isSubcategory && !isEditing ? 'Subcategory Name' : 'Category Name'}
          </label>
          <Input
            id="categoryName"
            type="text"
            value={name}
            onValueChange={setName}
            onKeyDown={handleKeyDown}
            placeholder={isSubcategory ? 'e.g., 15mL Conicals' : 'e.g., Pipette Tips'}
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
