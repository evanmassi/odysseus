/**
 * Category Modal
 *
 * Creates or renames an inventory category or subcategory via a compact dialog.
 * Persistence is injected, so the same modal backs equipment and supplies.
 */

import { useState, useEffect, useRef } from 'react';

import { FolderOpen, Plus, SquarePen } from 'lucide-react';

import { notifications } from '@shared/utils/notifications';

import { Button, Input } from '../../primitives';
import { FIELD_LABEL_STANDARD } from '../inputs/fieldLabelClass';
import { BaseModal } from '../overlays';

interface CategoryModalProps {
  isOpen: boolean;
  parentId?: string;
  parentName?: string;
  category?: { id: string; name: string };
  onClose: () => void;
  onCreate: (name: string, parentId?: string) => Promise<unknown>;
  onRename: (id: string, name: string) => Promise<unknown>;
  isPending: boolean;
  categoryPlaceholder: string;
  subcategoryPlaceholder: string;
}

export function CategoryModal({
  isOpen,
  parentId,
  parentName,
  category,
  onClose,
  onCreate,
  onRename,
  isPending,
  categoryPlaceholder,
  subcategoryPlaceholder,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const prevIsOpenRef = useRef(isOpen);

  const isEditing = !!category;
  const isSubcategory = !!parentId;

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
        await onRename(category.id, trimmed);
        notifications.success(`Renamed to "${trimmed}"`);
      } else {
        await onCreate(trimmed, parentId);
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
          <label htmlFor="categoryName" className={FIELD_LABEL_STANDARD}>
            {isSubcategory && !isEditing ? 'Subcategory Name' : 'Category Name'}
          </label>
          <Input
            id="categoryName"
            type="text"
            value={name}
            onValueChange={setName}
            onKeyDown={handleKeyDown}
            placeholder={isSubcategory ? subcategoryPlaceholder : categoryPlaceholder}
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
