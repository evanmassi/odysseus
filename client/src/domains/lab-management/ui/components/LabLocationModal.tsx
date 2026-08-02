/**
 * Lab Location Modal
 *
 * Manages the lab's location tree on the bulk-operations chassis: the tree on the left, the editor
 * for the selected place on the right. Deletion is refused server-side while stock or a nested
 * location depends on it, so the confirm dialog is the only guard this side.
 */

import { useState, useEffect, useMemo, useRef } from 'react';

import { CornerDownRight, FolderOpen, MapPin, Save, SquarePen, Trash2 } from 'lucide-react';

import {
  AccentTick,
  buildHierarchyOptions,
  Button,
  Input,
  NubDivider,
  ScrollArea,
  Select,
  Tooltip,
  withPlaceholder,
} from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { SelectTreeLines } from '@shared/ui/components/tree-lines';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';
import { notifications } from '@shared/utils/notifications';

import {
  useCreateLabLocationMutation,
  useDeleteLabLocationMutation,
  useUpdateLabLocationMutation,
} from '../../hooks/useLabLocationMutations';
import { useLabLocationsQuery } from '../../hooks/useLabLocationQueries';

import type { LabLocation } from '@odysseus/shared-schemas';

interface LabLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_LEVELS = ['l1', 'l2', 'l3'] as const;

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

export function LabLocationModal({ isOpen, onClose }: LabLocationModalProps) {
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [pendingDelete, setPendingDelete] = useState<LabLocation | undefined>();

  const { data: locations = [] } = useLabLocationsQuery();
  const createMutation = useCreateLabLocationMutation();
  const updateMutation = useUpdateLabLocationMutation();
  const deleteMutation = useDeleteLabLocationMutation();
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

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, LabLocation[]>();
    for (const location of locations) {
      const key = location.parentId ?? null;
      map.set(key, [...(map.get(key) ?? []), location]);
    }
    for (const siblings of map.values()) siblings.sort(compareByOrderThenName);
    return map;
  }, [locations]);

  const tierCounts = useMemo(
    () => ({
      top: locations.filter(location => !location.parentId).length,
      nested: locations.filter(location => location.parentId).length,
    }),
    [locations]
  );

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

  const renderTier = (parent: string | null, depth: number) => {
    const tier = childrenByParent.get(parent) ?? [];
    if (tier.length === 0) return null;

    return tier.map(location => {
      const hasChildren = (childrenByParent.get(location.id) ?? []).length > 0;

      return (
        <div key={location.id} data-level={TIER_LEVELS[depth]} data-id={location.id}>
          <div
            className={`select-tree-row group flex items-center gap-2 py-1 pl-3 pr-1 ${
              editingId === location.id ? 'bg-foreground/[0.06]' : ''
            }`}
          >
            {depth === 0 ? (
              <FolderOpen size={14} className="flex-shrink-0 text-muted-foreground" />
            ) : (
              <CornerDownRight size={13} className="flex-shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-medium text-card-foreground">
                {location.name}
              </span>
              {location.description && (
                <span className="block truncate text-caption text-muted-foreground">
                  {location.description}
                </span>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <Tooltip content="Rename" side="bottom">
                <Button variant="ghost" size="xs" iconOnly onClick={() => startEdit(location)}>
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

          {hasChildren && depth < TIER_LEVELS.length - 1 && (
            <div className="ml-3">{renderTier(location.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  const locator = (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <AccentTick />
        <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
          {locations.length} <span className="text-foreground/45">locations</span>
        </span>
      </span>
      <span className="flex-1" />
      <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/45">
        {tierCounts.top} top level · {tierCounts.nested} nested
      </span>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={editingId ? clearForm : onClose}>
        {editingId ? 'Cancel Edit' : 'Close'}
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={!name.trim()}
        isLoading={isPending}
        loadingText={editingId ? 'Saving...' : 'Adding...'}
        leftIcon={editingId ? <Save size={16} /> : undefined}
      >
        {editingId ? 'Save Changes' : 'Add Location'}
      </Button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Manage Locations"
        icon={<MapPin size={24} />}
        onClose={onClose}
        size="lg"
        fixedHeight
        locator={locator}
        footer={footer}
        contentClassName="p-0 h-full"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 w-2/5 flex-col overflow-auto border-r border-border bg-muted/30 p-4">
              <div className="mb-3 flex-shrink-0">
                <div className="flex items-center gap-2 pb-2">
                  <span className="flex-1 text-body-sm font-medium text-card-foreground">
                    All Locations
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {locations.length} {locations.length === 1 ? 'place' : 'places'}
                  </span>
                </div>
                <NubDivider tone="neutral" className="relative" />
              </div>

              <ScrollArea className="min-h-0 flex-1">
                {locations.length === 0 ? (
                  <p className="py-4 text-center text-body-sm text-muted-foreground">
                    No locations yet. Add the first one on the right.
                  </p>
                ) : (
                  <div
                    data-tree-id="lab-location"
                    className="nav-tree-select relative space-y-2 pr-2"
                  >
                    <SelectTreeLines treeId="lab-location" />
                    {renderTier(null, 0)}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex min-h-0 w-3/5 flex-col overflow-auto">
              <div className="flex-1 space-y-4 px-4 pt-4">
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
              </div>
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
