/**
 * Equipment Item Info Panel
 *
 * Read-only detail display for a selected equipment item with documents,
 * maintenance log timeline, and admin action buttons.
 */

import { useState } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  Edit,
  Trash2,
  XCircle,
  Plus,
  ExternalLink,
  X,
  Wrench,
  CircleCheckBig,
  MapPin,
  FolderOpen,
} from 'lucide-react';

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
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
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
    <div className="flex flex-col h-full min-h-0">
      <div className="pb-2 flex-shrink-0 px-4 pt-4">
        <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
          <Wrench size={16} className="text-secondary-foreground" />
          Equipment Information
        </h4>
      </div>

      <div className="bg-muted rounded-md px-3 py-2 mx-4 mb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {item.status === 'operational' ? (
            <CircleCheckBig size={18} className="text-success-text" />
          ) : (
            <Chip color={statusConfig.color} size="sm">
              {statusConfig.label}
            </Chip>
          )}
        </div>
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
                variant="ghost"
                size="sm"
                onClick={onDecommission}
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
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
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Location & Category chips */}
      {(item.location != null || categoryName != null) && (
        <div className="flex items-center gap-1.5 px-4 mb-3 flex-shrink-0">
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
      )}

      <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
        <div className="space-y-5">
          {/* Product Details */}
          <InfoGroup title="Product Details">
            <div className="flex items-baseline gap-1.5 -mt-0.5 mb-2">
              <span className="text-card-foreground font-semibold text-sm">{item.name}</span>
            </div>
            <InfoField label="Manufacturer" value={item.manufacturer} />
            <InfoField label="Model" value={item.model} />
            <InfoField label="Serial Number" value={item.serialNumber} />
            <InfoField label="Asset Tag" value={item.assetTag} />
            <InfoField label="Description" value={item.description} />
          </InfoGroup>

          {/* Procurement & Warranty */}
          <InfoGroup title="Procurement & Warranty">
            <InfoField label="Purchase Date" value={formatDate(item.purchaseDate)} />
            <InfoField label="Purchase Cost" value={formatCurrency(item.purchaseCost)} />
            <InfoField label="Warranty Expiration" value={formatDate(item.warrantyExpiration)} />
          </InfoGroup>

          {/* Maintenance */}
          <InfoGroup title="Maintenance">
            {item.conditionNotes && <InfoField label="Condition" value={item.conditionNotes} />}
            <InfoField label="Maintenance Due" value={formatDate(item.nextMaintenanceDate)} />
            {maintenanceLog.length === 0 && (
              <p className="text-xs text-card-foreground/30 italic mt-2">No maintenance entries</p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddMaintenance}
                className="mt-1"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Entry
              </Button>
            )}
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
              <InfoField label="Date" value={formatDate(item.decommissionDate)} />
              <InfoField label="Reason" value={item.decommissionReason} />
              <InfoField label="Disposal Method" value={item.disposalMethod} />
            </InfoGroup>
          )}
        </div>
      </ScrollArea>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        variant="danger"
        title="Delete Equipment"
        message={`Are you sure you want to delete "${item.name}"? This will also delete all documents and maintenance logs. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
