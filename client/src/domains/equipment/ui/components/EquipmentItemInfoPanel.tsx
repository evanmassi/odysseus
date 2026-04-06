/**
 * Equipment Item Info Panel
 *
 * Read-only detail display for a selected equipment item with documents,
 * maintenance log timeline, and admin action buttons.
 */

import { useState, useEffect, useRef } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  Edit,
  Trash2,
  Power,
  Plus,
  ExternalLink,
  X,
  Microscope,
  MapPin,
  FolderOpen,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useEquipmentItemDetailQuery } from '@domains/equipment/hooks';
import {
  useRemoveEquipmentDocumentMutation,
  useDeleteEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { EquipmentMaintenanceTimeline } from '@domains/equipment/ui/components/EquipmentMaintenanceTimeline';
import { Button, InfoField, InfoGroup } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type { EquipmentMaintenanceLog } from '@odysseus/shared-schemas';
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react';

interface EquipmentItemInfoPanelProps {
  itemId: string;
  onEdit: () => void;
  onDecommission: () => void;
  onAddDocument: () => void;
  onAddMaintenance: () => void;
  onEditMaintenance: (entry: EquipmentMaintenanceLog) => void;
  onDeleted: () => void;
  categoryName?: string;
}

const STATUS_LABELS: Record<
  string,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
  under_maintenance: { color: 'warning', label: 'Under Maintenance' },
  out_of_service: { color: 'danger', label: 'Out of Service' },
  decommissioned: { color: 'danger', label: 'Decommissioned' },
};

function formatDate(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  return formatDateForDisplay(date) || undefined;
}

function formatCurrency(amount: number | undefined): string | undefined {
  if (amount === undefined) return undefined;
  return `$${amount.toFixed(2)}`;
}

export function EquipmentItemInfoPanel({
  itemId,
  onEdit,
  onDecommission,
  onAddDocument,
  onAddMaintenance,
  onEditMaintenance,
  onDeleted,
  categoryName,
}: EquipmentItemInfoPanelProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    const el = scrollRef.current?.getElement();
    if (el) el.scrollTop = 0;
  }, [itemId]);
  const { data: detail } = useEquipmentItemDetailQuery(itemId);
  const deleteItemMutation = useDeleteEquipmentItemMutation();
  const removeDocumentMutation = useRemoveEquipmentDocumentMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const { item, documents, maintenanceLog } = detail;
  const statusConfig = STATUS_LABELS[item.status] ?? STATUS_LABELS['active'];
  const isDecommissioned = item.status === 'decommissioned';

  const handleDelete = async () => {
    try {
      await deleteItemMutation.mutateAsync(itemId);
      notifications.success('Equipment removed');
      onDeleted();
    } catch {
      notifications.error('Failed to remove equipment');
    }
    setShowDeleteConfirm(false);
  };

  const handleRemoveDocument = async (docId: string) => {
    try {
      await removeDocumentMutation.mutateAsync({ itemId, docId });
      notifications.success('Document removed');
    } catch {
      notifications.error('Failed to remove document');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
          <Microscope size={16} className="text-secondary-foreground" />
          Equipment Information
        </h4>
      </div>

      <div className="bg-muted rounded-md px-3 py-2 mx-4 mb-3 flex-shrink-0 space-y-2">
        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
            {!isDecommissioned && (
              <Button
                variant="ghost-danger"
                size="sm"
                onClick={onDecommission}
                leftIcon={<Power className="w-3.5 h-3.5" />}
              >
                Decommission
              </Button>
            )}
            <Button
              variant="ghost-danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Remove
            </Button>
          </div>
        )}
        <div
          className={`flex items-center gap-1.5 flex-wrap ${isAdmin ? 'pt-2 mt-2 border-t border-border' : ''}`}
        >
          {item.location && (
            <Chip color="info" size="sm" leftIcon={<MapPin />}>
              {item.location}
            </Chip>
          )}
          {categoryName && (
            <Chip color="info" size="sm" leftIcon={<FolderOpen />}>
              {categoryName}
            </Chip>
          )}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 min-h-0 px-4 pb-4">
        <div className="space-y-4">
          {/* Product Details */}
          <InfoGroup title="Product Details">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-card-foreground font-semibold text-sm">{item.name}</span>
              <Chip color={statusConfig.color} size="sm" className="uppercase tracking-wide">
                {statusConfig.label}
              </Chip>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <InfoField
                label="Manufacturer"
                value={item.manufacturer}
                inline={false}
                emptyText="—"
              />
              <InfoField label="Model" value={item.model} inline={false} emptyText="—" />
              <InfoField
                label="Serial Number"
                value={item.serialNumber}
                inline={false}
                emptyText="—"
              />
              <InfoField label="Asset Tag" value={item.assetTag} inline={false} emptyText="—" />
              <InfoField
                label="Description"
                value={item.description}
                inline={false}
                emptyText="—"
                className="col-span-2"
              />
            </div>
          </InfoGroup>

          {/* Procurement & Warranty */}
          <InfoGroup title="Procurement & Warranty">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <InfoField
                label="Purchase Date"
                value={formatDate(item.purchaseDate)}
                inline={false}
                emptyText="—"
              />
              <InfoField
                label="Purchase Cost"
                value={formatCurrency(item.purchaseCost)}
                inline={false}
                emptyText="—"
              />
              <InfoField
                label="Warranty Expiration"
                value={formatDate(item.warrantyExpiration)}
                inline={false}
                emptyText="—"
              />
            </div>
          </InfoGroup>

          {/* Maintenance */}
          <InfoGroup title="Maintenance">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <InfoField
                label="Condition"
                value={item.conditionNotes}
                inline={false}
                emptyText="—"
              />
              <InfoField
                label="Maintenance Due"
                value={formatDate(item.nextMaintenanceDate)}
                inline={false}
                emptyText="—"
              />
            </div>
            <EquipmentMaintenanceTimeline
              className="mt-3 pt-3 border-t border-border/50"
              maintenanceLog={maintenanceLog}
              itemId={itemId}
              isAdmin={isAdmin}
              onEditEntry={onEditMaintenance}
              onAddEntry={onAddMaintenance}
            />
          </InfoGroup>

          {/* Documents */}
          <InfoGroup title="Documents">
            {documents.length === 0 && (
              <p className="text-xs text-card-foreground/30 italic">No documents attached</p>
            )}
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-1">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  {doc.label}
                </a>
                {isAdmin && (
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    onClick={() => void handleRemoveDocument(doc.id)}
                    className="h-6"
                  >
                    <X size={12} />
                  </Button>
                )}
              </div>
            ))}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddDocument}
                className="mt-1"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Document
              </Button>
            )}
          </InfoGroup>

          {/* Notes */}
          {item.notes && (
            <InfoGroup title="Notes">
              <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{item.notes}</p>
            </InfoGroup>
          )}

          {/* Decommission Information */}
          {isDecommissioned && (
            <InfoGroup title="Decommission Information">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <InfoField
                  label="Date"
                  value={formatDate(item.decommissionDate)}
                  inline={false}
                  emptyText="—"
                />
                <InfoField
                  label="Reason"
                  value={item.decommissionReason}
                  inline={false}
                  emptyText="—"
                />
                <InfoField
                  label="Disposal Method"
                  value={item.disposalMethod}
                  inline={false}
                  emptyText="—"
                />
              </div>
            </InfoGroup>
          )}
        </div>
      </ScrollArea>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        variant="danger"
        title="Remove Equipment"
        message={`Are you sure you want to remove "${item.name}"? This will also remove all documents and maintenance logs. This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
