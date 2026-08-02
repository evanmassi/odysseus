/**
 * Location Modal
 *
 * Manages the lab's location tree: the existing places, and a form that adds a new one or renames
 * the one being edited. Deletion is refused server-side while stock or a nested location depends
 * on it, so the confirm dialog is the only guard this side.
 */

import { useState, useEffect, useMemo, useRef } from 'react';

import { MapPin, Plus, Save, SquarePen, Trash2, X } from 'lucide-react';

import {
  useCreateLocationMutation,
  useDeleteLocationMutation,
  useUpdateLocationMutation,
} from '@domains/lab-management/hooks/useLocationMutations';
import { useLocationsQuery } from '@domains/lab-management/hooks/useLocationQueries';
import { buildHierarchyOptions, Button, Input, Select, Tooltip, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils/notifications';

import type { LabLocation } from '@odysseus/shared-schemas';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The node and everything under it — none of which can become its own ancestor. */
function subtreeIds(locations: LabLocation[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const location of locations) {
      if (location.parentId && ids.has(location.parentId) && !ids.has(location.id)) {
        ids.add(location.id);
        added = true;
      }
    }
  }
  return ids;
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [pendingDelete, setPendingDelete] = useState<LabLocation | undefined>();

  const { data: locations = [] } = useLocationsQuery();
  const createMutation = useCreateLocationMutation();
  const updateMutation = useUpdateLocationMutation();
  const deleteMutation = useDeleteLocationMutation();
  const prevIsOpenRef = useRef(isOpen);

  const clearForm = () => {
    setEditingId(undefined);
    setName('');
    setDescription('');
    setParentId('');
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      clearForm();
      setPendingDelete(undefined);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const locationById = useMemo(
    () => new Map(locations.map(location => [location.id, location])),
    [locations]
  );

  // Tree order with the tier each row indents by — the same traversal the parent picker uses.
  const rows = useMemo(() => buildHierarchyOptions(locations), [locations]);

  const parentOptions = useMemo(() => {
    const excluded = editingId ? subtreeIds(locations, editingId) : new Set<string>();
    return withPlaceholder(
      'Top level',
      buildHierarchyOptions(locations.filter(location => !excluded.has(location.id)))
    );
  }, [locations, editingId]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (editingId) {
      updateMutation.mutate(
        {
          id: editingId,
          data: {
            name: trimmed,
            description: description.trim() || null,
            parentId: parentId || null,
          },
        },
        {
          onSuccess: () => {
            notifications.success(`Location "${trimmed}" updated`);
            clearForm();
          },
        }
      );
      return;
    }

    createMutation.mutate(
      {
        name: trimmed,
        description: description.trim() || undefined,
        parentId: parentId || undefined,
      },
      {
        onSuccess: () => {
          notifications.success(`Location "${trimmed}" created`);
          clearForm();
        },
      }
    );
  };

  const startEdit = (location: LabLocation) => {
    setEditingId(location.id);
    setName(location.name);
    setDescription(location.description ?? '');
    setParentId(location.parentId ?? '');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { id, name: deletedName } = pendingDelete;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        notifications.success(`Location "${deletedName}" removed`);
        if (editingId === id) clearForm();
      },
      onSettled: () => setPendingDelete(undefined),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim() && !isPending) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Manage Locations"
        icon={<MapPin size={24} />}
        onClose={onClose}
        size="sm"
      >
        <div className="space-y-4">
          {rows.length > 0 && (
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {rows.map(row => {
                const location = locationById.get(String(row.value));
                if (!location) return null;

                return (
                  <div
                    key={location.id}
                    className={`group flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-foreground/[0.04] ${
                      editingId === location.id ? 'bg-foreground/[0.06]' : ''
                    }`}
                    style={{ paddingLeft: `${(row.depth ?? 0) * 16 + 8}px` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body">{location.name}</p>
                      {location.description && (
                        <p className="truncate text-caption text-muted-foreground">
                          {location.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Tooltip content="Rename" side="bottom">
                        <Button
                          variant="ghost"
                          size="xs"
                          iconOnly
                          onClick={() => startEdit(location)}
                        >
                          <SquarePen className="h-3 w-3" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Remove" side="bottom">
                        <Button
                          variant="ghost-danger"
                          size="xs"
                          iconOnly
                          onClick={() => setPendingDelete(location)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-4 border-t border-line-faint pt-4">
            <div>
              <label htmlFor="locationName" className={FIELD_LABEL_STANDARD}>
                Location Name
              </label>
              <Input
                id="locationName"
                type="text"
                value={name}
                onValueChange={setName}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Back Supply Room"
                maxLength={200}
                fullWidth
              />
            </div>

            <div>
              <label htmlFor="locationDescription" className={FIELD_LABEL_STANDARD}>
                Description
              </label>
              <Input
                id="locationDescription"
                type="text"
                value={description}
                onValueChange={setDescription}
                placeholder="Optional details about this location"
                maxLength={500}
                fullWidth
              />
            </div>

            <Select
              label="Inside (optional)"
              options={parentOptions}
              value={parentId}
              onChange={v => setParentId(String(v ?? ''))}
              fullWidth
            />

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                variant="secondary"
                onClick={editingId ? clearForm : onClose}
                leftIcon={editingId ? <X size={16} /> : undefined}
              >
                {editingId ? 'Cancel Edit' : 'Close'}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!name.trim()}
                isLoading={isPending}
                loadingText={editingId ? 'Saving...' : 'Adding...'}
                leftIcon={editingId ? <Save size={16} /> : <Plus size={16} />}
              >
                {editingId ? 'Save Changes' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      </BaseModal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        variant="danger"
        title="Remove Location"
        message={`Are you sure you want to remove "${pendingDelete?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Remove"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(undefined)}
      />
    </>
  );
}
