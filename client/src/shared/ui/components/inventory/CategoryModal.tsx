/**
 * Category Modal
 *
 * Creates or renames an inventory category or subcategory via a compact dialog, plus the state
 * machine a catalog tab drives it with. Persistence is injected, so the same dialog and the same
 * add/rename/delete flow back equipment, supplies and reagents.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { FolderOpen, Plus, SquarePen } from 'lucide-react';

import { notifications } from '@shared/utils/notifications';

import { Button, Input } from '../../primitives';
import { FIELD_LABEL_STANDARD } from '../inputs/fieldLabelClass';
import { BaseModal } from '../overlays';
import { ConfirmDialog } from '../overlays/ConfirmDialog';

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
      size="sm"
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

/** The shape a catalog tab's categories satisfy; each catalog keeps its own type. */
interface CategoryShape {
  id: string;
  name: string;
  parentId: string | null;
}

/** Only what this file calls — so a tab passes its TanStack mutations without adapting them. */
interface CategoryMutation<TVars> {
  mutateAsync: (vars: TVars) => Promise<unknown>;
  isPending: boolean;
}

interface CategoryDeleteMutation {
  mutate: (id: string, options: { onSuccess: () => void; onSettled: () => void }) => void;
}

export interface CatalogCategoryState<TCategory extends CategoryShape> {
  /** `parent › child` per category id, for the rows and panels that name one. */
  categoryNameMap: Map<string, string>;
  onAddCategory: () => void;
  onAddSubcategory: (parentId: string) => void;
  onRenameCategory: (category: TCategory) => void;
  onDeleteCategory: (category: TCategory) => void;
  editor: {
    isOpen: boolean;
    parentId?: string;
    parentName?: string;
    category?: TCategory;
    close: () => void;
    create: (name: string, parentId?: string) => Promise<unknown>;
    rename: (id: string, name: string) => Promise<unknown>;
    isPending: boolean;
  };
  deletion: {
    isOpen: boolean;
    category?: TCategory;
    confirm: () => void;
    cancel: () => void;
  };
}

interface UseCatalogCategoriesArgs<TCategory extends CategoryShape> {
  categories: TCategory[];
  createMutation: CategoryMutation<{ name: string; parentId?: string }>;
  updateMutation: CategoryMutation<{ id: string; data: { name: string } }>;
  deleteMutation: CategoryDeleteMutation;
}

/** Add / rename / delete for a catalog tab's category tree. Render `CategoryManager` alongside. */
export function useCatalogCategories<TCategory extends CategoryShape>({
  categories,
  createMutation,
  updateMutation,
  deleteMutation,
}: UseCatalogCategoriesArgs<TCategory>): CatalogCategoryState<TCategory> {
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    parentId?: string;
    parentName?: string;
    category?: TCategory;
  }>({ isOpen: false });
  const [deleteState, setDeleteState] = useState<{ isOpen: boolean; category?: TCategory }>({
    isOpen: false,
  });

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      const parentName = c.parentId ? categories.find(p => p.id === c.parentId)?.name : undefined;
      map.set(c.id, parentName ? `${parentName} › ${c.name}` : c.name);
    });
    return map;
  }, [categories]);

  const onAddCategory = useCallback(() => setEditorState({ isOpen: true }), []);

  const onAddSubcategory = useCallback(
    (parentId: string) => {
      const parent = categories.find(c => c.id === parentId);
      setEditorState({ isOpen: true, parentId, parentName: parent?.name });
    },
    [categories]
  );

  const onRenameCategory = useCallback((category: TCategory) => {
    setEditorState({ isOpen: true, parentId: category.parentId ?? undefined, category });
  }, []);

  const onDeleteCategory = useCallback((category: TCategory) => {
    setDeleteState({ isOpen: true, category });
  }, []);

  const confirmDelete = useCallback(() => {
    const category = deleteState.category;
    if (!category) return;
    deleteMutation.mutate(category.id, {
      onSuccess: () => notifications.success(`"${category.name}" removed`),
      onSettled: () => setDeleteState({ isOpen: false }),
    });
  }, [deleteState.category, deleteMutation]);

  return {
    categoryNameMap,
    onAddCategory,
    onAddSubcategory,
    onRenameCategory,
    onDeleteCategory,
    editor: {
      ...editorState,
      close: () => setEditorState(prev => ({ ...prev, isOpen: false })),
      create: (name, parentId) => createMutation.mutateAsync({ name, parentId }),
      rename: (id, name) => updateMutation.mutateAsync({ id, data: { name } }),
      isPending: createMutation.isPending || updateMutation.isPending,
    },
    deletion: {
      isOpen: deleteState.isOpen,
      category: deleteState.category,
      confirm: confirmDelete,
      cancel: () => setDeleteState({ isOpen: false }),
    },
  };
}

interface CategoryManagerProps<TCategory extends CategoryShape> {
  state: CatalogCategoryState<TCategory>;
  categoryPlaceholder: string;
  subcategoryPlaceholder: string;
}

/** The two dialogs `useCatalogCategories` drives — mount once per catalog tab. */
export function CategoryManager<TCategory extends CategoryShape>({
  state,
  categoryPlaceholder,
  subcategoryPlaceholder,
}: CategoryManagerProps<TCategory>) {
  const { editor, deletion } = state;

  return (
    <>
      <CategoryModal
        isOpen={editor.isOpen}
        parentId={editor.parentId}
        parentName={editor.parentName}
        category={editor.category}
        onClose={editor.close}
        onCreate={editor.create}
        onRename={editor.rename}
        isPending={editor.isPending}
        categoryPlaceholder={categoryPlaceholder}
        subcategoryPlaceholder={subcategoryPlaceholder}
      />

      <ConfirmDialog
        isOpen={deletion.isOpen}
        variant="danger"
        title="Remove Category"
        message={`Are you sure you want to remove "${deletion.category?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={deletion.confirm}
        onCancel={deletion.cancel}
      />
    </>
  );
}
