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
  ExternalLink,
  X,
  NotepadText,
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
import { Button, Chip, DetailRow, NubDivider, PanelHeader, SectionHeader } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';
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

function StripLabel({ children }: { children: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
      <span
        aria-hidden
        className="h-2.5 w-0.5 bg-primary/80 shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
      />
      {children}
    </span>
  );
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
      <ConsolePanel
        intensity="soft"
        className="flex h-full min-h-0 flex-col items-center justify-center"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Loading…
        </span>
      </ConsolePanel>
    );
  }

  const { item, documents, maintenanceLog } = detail;
  const statusConfig = STATUS_LABELS[item.status] ?? STATUS_LABELS['active'];
  const isDecommissioned = item.status === 'decommissioned';

  const hasIdentification = [item.manufacturer, item.model, item.serialNumber, item.assetTag].some(
    Boolean
  );
  const hasProcurement =
    item.purchaseCost != null || Boolean(item.purchaseDate) || Boolean(item.warrantyExpiration);

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
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<NotepadText className="h-4 w-4" />} title="Equipment Information" />
      </div>

      <div className="relative flex-shrink-0 border-b border-line-faint bg-black/35 px-4 py-2.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
        />
        <div className="grid grid-cols-[auto_1fr] items-center justify-items-start gap-x-3 gap-y-2">
          <StripLabel>Status</StripLabel>
          <Chip size="sm" color={statusConfig.color}>
            {statusConfig.label}
          </Chip>
          {categoryName && (
            <>
              <StripLabel>Category</StripLabel>
              <Chip size="sm" color="info" leftIcon={<FolderOpen />}>
                {categoryName}
              </Chip>
            </>
          )}
          {item.location && (
            <>
              <StripLabel>Location</StripLabel>
              <Chip size="sm" color="info" leftIcon={<MapPin />}>
                {item.location}
              </Chip>
            </>
          )}
        </div>
        <NubDivider tone="primary" className="absolute inset-x-0 -bottom-px" />
      </div>

      <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">{item.name}</h3>
            {item.description && (
              <p className="mt-1 text-sm leading-relaxed text-card-foreground/70">
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

          <div>
            <SectionHeader title="Documents" size="sm" />
            {documents.length === 0 ? (
              <p className="text-sm italic text-card-foreground/30">No documents attached</p>
            ) : (
              <div>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="-mx-4 flex items-center justify-between gap-3 border-b border-line-faint px-4 py-2 last:border-b-0"
                  >
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink size={12} className="flex-shrink-0" />
                      <span className="truncate">{doc.label}</span>
                    </a>
                    {isAdmin && (
                      <Button
                        variant="ghost-danger"
                        size="xs"
                        iconOnly
                        onClick={() => void handleRemoveDocument(doc.id)}
                        aria-label="Remove document"
                      >
                        <X size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddDocument}
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
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground/85">
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
        <div className="relative flex-shrink-0 border-t border-line-faint bg-black/15 px-4 py-3">
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
    </ConsolePanel>
  );
}
