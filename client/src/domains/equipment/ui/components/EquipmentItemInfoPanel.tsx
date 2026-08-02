/**
 * Equipment Item Info Panel
 *
 * Read-only detail display for a selected equipment item with documents,
 * maintenance log timeline, and admin action buttons.
 */

import { useState, useEffect, useRef } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  SquarePen,
  Trash2,
  Power,
  Plus,
  Edit,
  ExternalLink,
  X,
  NotepadText,
  MapPin,
  FolderOpen,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import {
  useAddEquipmentDocumentMutation,
  useUpdateEquipmentDocumentMutation,
  useRemoveEquipmentDocumentMutation,
  useDeleteEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { useEquipmentItemDetailQuery } from '@domains/equipment/hooks/useEquipmentQueries';
import { EquipmentMaintenanceTimeline } from '@domains/equipment/ui/components/EquipmentMaintenanceTimeline';
import { EQUIPMENT_STATUS_DISPLAY } from '@domains/equipment/utils/equipmentStatus';
import { useAttributesQuery } from '@domains/lab-management';
import {
  Button,
  Chip,
  DetailRow,
  HeaderStrip,
  NubDivider,
  PanelHeader,
  SectionHeader,
  StripLabel,
} from '@shared/ui';
import { toAttributeDisplayRows } from '@shared/ui/components/inventory';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import {
  DocumentLinkModal,
  type DocumentLinkValues,
} from '@shared/ui/components/overlays/DocumentLinkModal';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';

import type { EquipmentDocument, EquipmentMaintenanceLog } from '@odysseus/shared-schemas';
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react';

interface EquipmentItemInfoPanelProps {
  itemId: string;
  onEdit: () => void;
  onDecommission: () => void;
  onAddMaintenance: () => void;
  onEditMaintenance: (entry: EquipmentMaintenanceLog) => void;
  onDeleted: () => void;
  categoryName?: string;
}

function formatDate(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  return formatDateForDisplay(date) || undefined;
}

export function EquipmentItemInfoPanel({
  itemId,
  onEdit,
  onDecommission,
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
  const { data: attributes } = useAttributesQuery();
  const deleteItemMutation = useDeleteEquipmentItemMutation();
  const addDocumentMutation = useAddEquipmentDocumentMutation();
  const updateDocumentMutation = useUpdateEquipmentDocumentMutation();
  const removeDocumentMutation = useRemoveEquipmentDocumentMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    doc?: EquipmentDocument;
  }>({ isOpen: false, mode: 'add' });

  if (!detail) {
    return (
      <ConsolePanel
        intensity="soft"
        className="flex h-full min-h-0 flex-col items-center justify-center"
      >
        <span className="type-label text-label-xs tracking-label-wide text-muted-foreground">
          Loading…
        </span>
      </ConsolePanel>
    );
  }

  const { item, documents, maintenanceLog, attributeValues } = detail;
  const attributeRows = toAttributeDisplayRows(
    attributes?.definitions ?? [],
    attributes?.options ?? [],
    attributeValues
  );
  const statusColor = EQUIPMENT_STATUS_DISPLAY[item.status].color;
  const statusLabel = EQUIPMENT_STATUS_DISPLAY[item.status].label;
  const isDecommissioned = item.status === 'decommissioned';

  const hasIdentification = [item.manufacturer, item.model, item.serialNumber, item.assetTag].some(
    Boolean
  );
  const hasProcurement =
    item.purchaseCost != null ||
    Boolean(item.purchaseDate) ||
    Boolean(item.warrantyExpiration) ||
    Boolean(item.vendorName) ||
    Boolean(item.vendorCatalogNumber);

  const handleDelete = () => {
    deleteItemMutation.mutate(itemId, {
      onSuccess: () => {
        notifications.success('Equipment removed');
        onDeleted();
      },
      onSettled: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleRemoveDocument = (docId: string) => {
    removeDocumentMutation.mutate(
      { itemId, docId },
      {
        onSuccess: () => {
          notifications.success('Document removed');
        },
      }
    );
  };

  const handleSaveDocument = async (values: DocumentLinkValues) => {
    if (documentModal.mode === 'edit' && documentModal.doc) {
      await updateDocumentMutation.mutateAsync({
        itemId,
        docId: documentModal.doc.id,
        data: { label: values.label, url: values.url, notes: values.notes ?? null },
      });
      notifications.success('Document updated');
    } else {
      await addDocumentMutation.mutateAsync({
        itemId,
        data: { label: values.label, url: values.url, notes: values.notes },
      });
      notifications.success('Document added');
    }
  };

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<NotepadText className="h-4 w-4" />} title="Equipment Information" />
      </div>

      <HeaderStrip className="px-4 py-2.5">
        <div className="grid grid-cols-[auto_1fr] items-center justify-items-start gap-x-3 gap-y-2">
          <StripLabel>Status</StripLabel>
          <Chip size="sm" color={statusColor}>
            {statusLabel}
          </Chip>
          {categoryName && (
            <>
              <StripLabel>Category</StripLabel>
              <Chip size="sm" color="info" lead={<FolderOpen />}>
                {categoryName}
              </Chip>
            </>
          )}
          {item.location && (
            <>
              <StripLabel>Location</StripLabel>
              <Chip size="sm" color="info" lead={<MapPin />}>
                {item.location}
              </Chip>
            </>
          )}
        </div>
      </HeaderStrip>

      <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-body font-semibold text-card-foreground">{item.name}</h3>
            {item.description && (
              <p className="mt-1 text-body leading-relaxed text-card-foreground/70">
                {item.description}
              </p>
            )}
          </div>

          {hasIdentification && (
            <div>
              <SectionHeader title="Identification" size="sm" />
              <div>
                <DetailRow label="Manufacturer" value={item.manufacturer} />
                <DetailRow label="Model" value={item.model} />
                <DetailRow label="Serial Number" value={item.serialNumber} />
                <DetailRow label="Asset Tag" value={item.assetTag} />
              </div>
            </div>
          )}

          {hasProcurement && (
            <div>
              <SectionHeader title="Procurement & Warranty" size="sm" />
              <div>
                <DetailRow label="Vendor" value={item.vendorName} />
                <DetailRow label="Vendor Catalog #" value={item.vendorCatalogNumber} />
                <DetailRow label="Purchase Date" value={formatDate(item.purchaseDate)} />
                <DetailRow label="Purchase Cost" value={formatCurrency(item.purchaseCost)} />
                <DetailRow
                  label="Warranty Expiration"
                  value={formatDate(item.warrantyExpiration)}
                />
              </div>
            </div>
          )}

          <div>
            <SectionHeader title="Maintenance" size="sm" />
            <div>
              <DetailRow label="Condition" value={item.conditionNotes} />
              <DetailRow label="Maintenance Due" value={formatDate(item.nextMaintenanceDate)} />
            </div>
            <EquipmentMaintenanceTimeline
              className="mt-3"
              maintenanceLog={maintenanceLog}
              itemId={itemId}
              isAdmin={isAdmin}
              onEditEntry={onEditMaintenance}
              onAddEntry={onAddMaintenance}
            />
          </div>

          {attributeRows.length > 0 && (
            <div>
              <SectionHeader title="Attributes" size="sm" />
              <div>
                {attributeRows.map(row => (
                  <DetailRow key={row.id} label={row.name} value={row.display} />
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionHeader title="Documents" size="sm" />
            {documents.length === 0 ? (
              <p className="text-body-sm italic text-card-foreground/30">No documents attached</p>
            ) : (
              <div>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="-mx-4 border-b border-line-faint px-4 py-2 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-1.5 text-body-sm text-primary hover:underline"
                      >
                        <ExternalLink size={12} className="flex-shrink-0" />
                        <span className="truncate">{doc.label}</span>
                      </a>
                      {isAdmin && (
                        <div className="flex flex-shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            iconOnly
                            onClick={() => setDocumentModal({ isOpen: true, mode: 'edit', doc })}
                            aria-label="Edit document"
                          >
                            <Edit size={12} />
                          </Button>
                          <Button
                            variant="ghost-danger"
                            size="xs"
                            iconOnly
                            onClick={() => void handleRemoveDocument(doc.id)}
                            aria-label="Remove document"
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="mt-0.5 text-caption text-muted-foreground">{doc.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDocumentModal({ isOpen: true, mode: 'add' })}
                className="mt-1.5"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Document
              </Button>
            )}
          </div>

          {item.notes && (
            <div>
              <SectionHeader title="Notes" size="sm" />
              <div className="whitespace-pre-wrap text-body leading-relaxed text-card-foreground/85">
                {item.notes}
              </div>
            </div>
          )}

          {isDecommissioned && (
            <div>
              <SectionHeader title="Decommission Information" size="sm" />
              <div>
                <DetailRow label="Date" value={formatDate(item.decommissionDate)} />
                <DetailRow label="Reason" value={item.decommissionReason} />
                <DetailRow label="Disposal Method" value={item.disposalMethod} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {isAdmin && (
        <div className="relative flex-shrink-0 border-t border-line-faint bg-card px-4 py-3 dark:bg-shade/15">
          <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Remove
            </Button>
            {!isDecommissioned && (
              <Button
                variant="warning"
                size="sm"
                leftIcon={<Power className="h-4 w-4" />}
                onClick={onDecommission}
              >
                Decommission
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              leftIcon={<SquarePen className="h-4 w-4" />}
              onClick={onEdit}
            >
              Edit
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        variant="danger"
        title="Remove Equipment"
        message={`Are you sure you want to remove "${item.name}"? This will also remove all documents and maintenance logs. This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <DocumentLinkModal
        isOpen={documentModal.isOpen}
        mode={documentModal.mode}
        initialValues={
          documentModal.doc
            ? {
                label: documentModal.doc.label,
                url: documentModal.doc.url,
                notes: documentModal.doc.notes,
              }
            : undefined
        }
        isPending={addDocumentMutation.isPending || updateDocumentMutation.isPending}
        onSave={handleSaveDocument}
        onClose={() => setDocumentModal(prev => ({ ...prev, isOpen: false }))}
      />
    </ConsolePanel>
  );
}
