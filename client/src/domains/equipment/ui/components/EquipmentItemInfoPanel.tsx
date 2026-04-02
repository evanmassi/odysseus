/**
 * Equipment Item Info Panel
 *
 * Read-only detail display for a selected equipment item with documents,
 * maintenance log timeline, and admin action buttons.
 */

import { useState } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Edit, Trash2, XCircle, Plus, ExternalLink, X } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useEquipmentItemDetailQuery } from '@domains/equipment/hooks';
import {
  useRemoveEquipmentDocumentMutation,
  useDeleteEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, InfoField, InfoGroup } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

interface EquipmentItemInfoPanelProps {
  itemId: string;
  onEdit: () => void;
  onDecommission: () => void;
  onAddDocument: () => void;
  onAddMaintenance: () => void;
  onEditMaintenance: (entryId: string) => void;
  onDeleted: () => void;
  categoryName?: string;
}

const STATUS_LABELS: Record<
  string,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  operational: { color: 'success', label: 'Operational' },
  maintenance: { color: 'warning', label: 'Maintenance' },
  out_of_service: { color: 'danger', label: 'Out of Service' },
  decommissioned: { color: 'default', label: 'Decommissioned' },
};

function formatDate(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  return new Date(date).toLocaleDateString();
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
  const statusConfig = STATUS_LABELS[item.status] ?? STATUS_LABELS['operational'];
  const isDecommissioned = item.status === 'decommissioned';

  const handleDelete = async () => {
    try {
      await deleteItemMutation.mutateAsync(itemId);
      notifications.success('Equipment item deleted');
      onDeleted();
    } catch {
      notifications.error('Failed to delete equipment item');
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
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Edit size={14} className="mr-1" />
              Edit
            </Button>
            {!isDecommissioned && (
              <Button variant="secondary" size="sm" onClick={onDecommission}>
                <XCircle size={14} className="mr-1" />
                Decommission
              </Button>
            )}
            <Button variant="ghost-danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} className="mr-1" />
              Delete
            </Button>
          </div>
        )}

        {/* Identity */}
        <InfoGroup title="Identity">
          <InfoField label="Name" value={item.name} />
          <InfoField label="Internal ID" value={item.internalId} />
          <InfoField label="Serial Number" value={item.serialNumber} />
          <InfoField label="Category" value={categoryName} />
        </InfoGroup>

        {/* Product */}
        <InfoGroup title="Product">
          <InfoField label="Manufacturer" value={item.manufacturer} />
          <InfoField label="Model" value={item.model} />
          <InfoField label="Description" value={item.description} />
        </InfoGroup>

        {/* Status */}
        <InfoGroup title="Status">
          <div className="flex items-center gap-2 mb-2">
            <Chip color={statusConfig.color} size="sm">
              {statusConfig.label}
            </Chip>
          </div>
          <InfoField label="Condition Notes" value={item.conditionNotes} />
          <InfoField label="Location" value={item.location} />
        </InfoGroup>

        {/* Dates */}
        <InfoGroup title="Dates">
          <InfoField label="Purchase Date" value={formatDate(item.purchaseDate)} />
          <InfoField label="Warranty Expiration" value={formatDate(item.warrantyExpiration)} />
          <InfoField label="Next Maintenance" value={formatDate(item.nextMaintenanceDate)} />
        </InfoGroup>

        {/* Financial */}
        {(item.purchaseCost !== undefined || item.assetTag) && (
          <InfoGroup title="Financial">
            <InfoField label="Purchase Cost" value={formatCurrency(item.purchaseCost)} />
            <InfoField label="Asset Tag" value={item.assetTag} />
          </InfoGroup>
        )}

        {/* Decommission Info */}
        {isDecommissioned && (
          <InfoGroup title="Decommission Info">
            <InfoField label="Date" value={formatDate(item.decommissionDate)} />
            <InfoField label="Reason" value={item.decommissionReason} />
            <InfoField label="Disposal Method" value={item.disposalMethod} />
          </InfoGroup>
        )}

        {/* Notes */}
        {item.notes && (
          <InfoGroup title="Notes">
            <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{item.notes}</p>
          </InfoGroup>
        )}

        {/* Documents */}
        <InfoGroup title="Documents">
          {documents.length === 0 && (
            <p className="text-xs text-muted-foreground">No documents attached</p>
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
            <Button variant="ghost" size="sm" onClick={onAddDocument} className="mt-1">
              <Plus size={14} className="mr-1" />
              Add Document
            </Button>
          )}
        </InfoGroup>

        {/* Maintenance Log */}
        <InfoGroup title="Maintenance Log">
          {maintenanceLog.length === 0 && (
            <p className="text-xs text-muted-foreground">No maintenance entries</p>
          )}
          {maintenanceLog.map(entry => (
            <div
              key={entry.id}
              className="border-l-2 border-border pl-3 py-2 text-sm cursor-pointer hover:bg-accent/30 rounded-r transition-colors"
              onClick={() => isAdmin && onEditMaintenance(entry.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' && isAdmin) onEditMaintenance(entry.id);
              }}
              role={isAdmin ? 'button' : undefined}
              tabIndex={isAdmin ? 0 : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-secondary-foreground">
                  {entry.maintenanceType}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.datePerformed)}
                </span>
              </div>
              {entry.performedBy && (
                <p className="text-xs text-muted-foreground">By: {entry.performedBy}</p>
              )}
              {entry.description && (
                <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
              )}
            </div>
          ))}
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={onAddMaintenance} className="mt-1">
              <Plus size={14} className="mr-1" />
              Add Entry
            </Button>
          )}
        </InfoGroup>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        variant="danger"
        title="Delete Equipment"
        message={`Are you sure you want to delete "${item.name}"? This will also delete all documents and maintenance logs. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </ScrollArea>
  );
}
