/**
 * Reagent Item Info Panel
 *
 * Read-only detail for the selected reagent: chemistry, per-lot stock, packaging,
 * safety documents, and the admin archive/remove actions.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { formatQuantity, isAdminRole } from '@odysseus/shared-schemas';
import {
  Archive,
  ClipboardList,
  Edit,
  ExternalLink,
  FolderOpen,
  MapPin,
  NotepadText,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useAttributesQuery, useLocationsQuery } from '@domains/lab-management';
import {
  useAddReagentBarcodeMutation,
  useAddReagentDocumentMutation,
  useArchiveReagentItemMutation,
  useDeleteReagentItemMutation,
  useReagentItemDetailQuery,
  useRegenerateReagentInternalBarcodeMutation,
  useRemoveReagentBarcodeMutation,
  useRemoveReagentDocumentMutation,
  useUpdateReagentBarcodeMutation,
  useUpdateReagentDocumentMutation,
} from '@domains/reagents/hooks';
import { isLotDrawable } from '@domains/reagents/utils/reagentLots';
import { REAGENT_STATUS_DISPLAY } from '@domains/reagents/utils/reagentStatus';
import {
  Button,
  Chip,
  DetailRow,
  HeaderStrip,
  NubDivider,
  OverflowMenu,
  PanelHeader,
  SectionHeader,
  StripLabel,
  Tooltip,
} from '@shared/ui';
import { BarcodeAddForm, BarcodeList } from '@shared/ui/components/barcodes';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import {
  DocumentLinkModal,
  type DocumentLinkValues,
} from '@shared/ui/components/overlays/DocumentLinkModal';
import { DOCUMENT_TYPE_LABELS } from '@shared/ui/components/overlays/documentTypeLabels';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';
import { orderPackagingChain } from '@shared/utils/packagingChain';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { ReagentLotPanel } from './ReagentLotPanel';
import { ReagentTransactionTimeline } from './ReagentTransactionTimeline';

import type { TransactionMode, TransactionPrefill } from './ReagentTransactionForm';
import type { ReagentDocument } from '@odysseus/shared-schemas';
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react';

interface ReagentItemInfoPanelProps {
  itemId: string;
  onEdit: () => void;
  onRecordTransaction: () => void;
  onVoidAndReplace: (
    itemId: string,
    initialTab: TransactionMode,
    prefill: TransactionPrefill
  ) => void;
  onDeleted: () => void;
  categoryName?: string;
}

export function ReagentItemInfoPanel({
  itemId,
  onEdit,
  onRecordTransaction,
  onVoidAndReplace,
  onDeleted,
  categoryName,
}: ReagentItemInfoPanelProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    const el = scrollRef.current?.getElement();
    if (el) el.scrollTop = 0;
  }, [itemId]);

  const { data: detail } = useReagentItemDetailQuery(itemId);
  const { data: locations = [] } = useLocationsQuery();
  const { data: attributes } = useAttributesQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const archiveItemMutation = useArchiveReagentItemMutation();
  const deleteItemMutation = useDeleteReagentItemMutation();
  const addDocumentMutation = useAddReagentDocumentMutation();
  const updateDocumentMutation = useUpdateReagentDocumentMutation();
  const removeDocumentMutation = useRemoveReagentDocumentMutation();
  const addBarcodeMutation = useAddReagentBarcodeMutation();
  const updateBarcodeMutation = useUpdateReagentBarcodeMutation();
  const removeBarcodeMutation = useRemoveReagentBarcodeMutation();
  const regenerateBarcodeMutation = useRegenerateReagentInternalBarcodeMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    doc?: ReagentDocument;
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

  const { item, documents, barcodes, lots, packagingLevels, recentTransactions, attributeValues } =
    detail;
  const statusConfig = REAGENT_STATUS_DISPLAY[item.status];
  const isArchived = item.status === 'archived';

  // A lot barcode labels one bottle, so it belongs on that lot's row, not in the item's list.
  const itemBarcodes = barcodes.filter(bc => !bc.lotId);
  const lotBarcodes = barcodes.filter(bc => bc.lotId);

  const locationChips = [...new Set(lots.filter(isLotDrawable).map(lot => lot.locationId))]
    .map(id => ({ id, name: locationNameMap.get(id) }))
    .filter((location): location is { id: string; name: string } => !!location.name);

  const concentration =
    item.concentration !== undefined && item.concentrationUnit
      ? formatQuantity(item.concentration, item.concentrationUnit)
      : undefined;

  // One row per attribute that carries a value; multi-select values join into one line.
  const attributeRows = (attributes?.definitions ?? [])
    .map(definition => {
      const values = attributeValues.filter(value => value.definitionId === definition.id);
      const optionLabels = values
        .map(
          value =>
            attributes?.options.find(option => option.id === value.valueOptionId)?.value ?? ''
        )
        .filter(Boolean);
      const scalar = values.find(value => value.valueText !== null || value.valueNumber !== null);
      const display =
        optionLabels.length > 0
          ? optionLabels.join(', ')
          : (scalar?.valueText ?? scalar?.valueNumber?.toString());
      return { id: definition.id, name: definition.name, display };
    })
    .filter((row): row is { id: string; name: string; display: string } => !!row.display);

  const reorderQuantity =
    item.reorderQuantity !== undefined
      ? `${item.reorderQuantity} ${item.reorderUnit ? pluralizeUnit(item.reorderUnit, item.reorderQuantity) : ''}`.trim()
      : undefined;

  const handleArchive = () => {
    archiveItemMutation.mutate(itemId, {
      onSuccess: () => {
        notifications.success('Item archived');
        onDeleted();
      },
    });
  };

  const handleDelete = () => {
    deleteItemMutation.mutate(itemId, {
      onSuccess: () => {
        notifications.success('Item removed');
        onDeleted();
      },
      onSettled: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleSaveDocument = async (values: DocumentLinkValues) => {
    if (documentModal.mode === 'edit' && documentModal.doc) {
      await updateDocumentMutation.mutateAsync({
        itemId,
        docId: documentModal.doc.id,
        data: {
          label: values.label,
          url: values.url,
          notes: values.notes ?? null,
          docType: values.docType ?? null,
        },
      });
      notifications.success('Document updated');
    } else {
      await addDocumentMutation.mutateAsync({
        itemId,
        data: {
          label: values.label,
          url: values.url,
          notes: values.notes,
          docType: values.docType,
        },
      });
      notifications.success('Document added');
    }
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

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<NotepadText className="h-4 w-4" />} title="Reagent Information" />
      </div>

      <HeaderStrip className="px-4 py-2.5">
        <div className="grid grid-cols-[auto_1fr] items-center justify-items-start gap-x-3 gap-y-2">
          <StripLabel>Status</StripLabel>
          <Chip size="sm" color={statusConfig.color}>
            {statusConfig.label}
          </Chip>
          {item.reagentType && (
            <>
              <StripLabel>Type</StripLabel>
              <Chip size="sm" color="default">
                {item.reagentType}
              </Chip>
            </>
          )}
          {categoryName && (
            <>
              <StripLabel>Category</StripLabel>
              <Chip size="sm" color="info" lead={<FolderOpen />}>
                {categoryName}
              </Chip>
            </>
          )}
          {locationChips.length > 0 && (
            <>
              <StripLabel>Location</StripLabel>
              <div className="flex flex-wrap gap-1.5">
                {locationChips.map(location => (
                  <Chip key={location.id} size="sm" color="info" lead={<MapPin />}>
                    {location.name}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </div>
      </HeaderStrip>

      <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-body font-semibold text-card-foreground">{item.name}</h3>
            {item.description && (
              <p className="mt-1 whitespace-pre-wrap text-body leading-relaxed text-card-foreground/70">
                {item.description}
              </p>
            )}
          </div>

          <div>
            <SectionHeader title="Item Details" size="sm" />
            <div>
              <DetailRow label="Manufacturer" value={item.manufacturer} />
              <DetailRow label="Catalog #" value={item.catalogNumber} />
              <DetailRow label="Vendor" value={item.vendorName} />
              <DetailRow label="Vendor Catalog #" value={item.vendorCatalogNumber} />
              <DetailRow label="CAS #" value={item.casNumber} />
              <DetailRow label="Concentration" value={concentration} />
              <DetailRow label="Stock Unit" value={item.stockUnit} />
              <DetailRow
                label="Expiry Warning"
                value={
                  item.expiryWarningDays !== undefined
                    ? `${item.expiryWarningDays} ${pluralizeUnit('day', item.expiryWarningDays)}`
                    : undefined
                }
              />
            </div>
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
            <SectionHeader title="Lots" size="sm" />
            <ReagentLotPanel
              itemId={itemId}
              itemName={item.name}
              lots={lots}
              lotBarcodes={lotBarcodes}
              stockUnit={item.stockUnit}
              expiryWarningDays={item.expiryWarningDays}
            />
          </div>

          {packagingLevels.length > 0 && (
            <div>
              <SectionHeader title="Packaging" size="sm" />
              <div className="border border-line-soft">
                {orderPackagingChain(packagingLevels).map(level => (
                  <div
                    key={level.id}
                    className="flex items-baseline justify-between border-b border-line-faint px-3 py-2 last:border-b-0"
                  >
                    <span className="font-display text-body-sm capitalize text-card-foreground">
                      {level.unitName}
                    </span>
                    <span className="font-mono text-data-sm tracking-[0.04em] text-muted-foreground">
                      contains {level.quantity}{' '}
                      {pluralizeUnit(level.parentUnit ?? item.stockUnit ?? 'unit', level.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionHeader title="Barcodes" size="sm" />
            <BarcodeList
              barcodes={itemBarcodes}
              itemName={item.name}
              manufacturer={item.manufacturer}
              catalogNumber={item.catalogNumber}
              isAdmin={isAdmin}
              onUpdateLabel={(barcodeId, label, onSuccess) =>
                updateBarcodeMutation.mutate({ itemId, barcodeId, data: { label } }, { onSuccess })
              }
              onRemove={(barcodeId, onSuccess) =>
                removeBarcodeMutation.mutate({ itemId, barcodeId }, { onSuccess })
              }
              onRegenerate={() => regenerateBarcodeMutation.mutate(itemId)}
              isSavingLabel={updateBarcodeMutation.isPending}
              isRegenerating={regenerateBarcodeMutation.isPending}
            />
            {isAdmin && (
              <div className="mt-2">
                <BarcodeAddForm
                  onAdd={(data, onSuccess) =>
                    addBarcodeMutation.mutate({ itemId, data }, { onSuccess })
                  }
                  isPending={addBarcodeMutation.isPending}
                />
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Documents" size="sm" />
            {documents.length > 0 ? (
              <div className="space-y-1.5">
                {documents.map(doc => (
                  <div key={doc.id}>
                    <div className="flex items-center justify-between text-body-sm">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {doc.docType && (
                          <Chip color="default" size="xs">
                            {DOCUMENT_TYPE_LABELS[doc.docType]}
                          </Chip>
                        )}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
                        >
                          <span className="truncate">{doc.label}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5">
                          <Tooltip content="Edit" side="bottom">
                            <Button
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={() => setDocumentModal({ isOpen: true, mode: 'edit', doc })}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Remove" side="bottom">
                            <Button
                              variant="ghost-danger"
                              size="xs"
                              iconOnly
                              onClick={() => handleRemoveDocument(doc.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="mt-0.5 text-caption text-muted-foreground">{doc.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption italic text-muted-foreground">No documents</p>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setDocumentModal({ isOpen: true, mode: 'add' })}
              >
                Add Document
              </Button>
            )}
          </div>

          {item.notes && (
            <div>
              <SectionHeader title="Notes" size="sm" />
              <p className="whitespace-pre-wrap text-body text-card-foreground">{item.notes}</p>
            </div>
          )}

          <div>
            <SectionHeader title="Reorder Settings" size="sm" />
            <div>
              <DetailRow
                label="Threshold"
                value={
                  item.reorderThreshold !== undefined
                    ? item.stockUnit
                      ? formatQuantity(item.reorderThreshold, item.stockUnit)
                      : String(item.reorderThreshold)
                    : undefined
                }
              />
              <DetailRow label="Reorder Qty" value={reorderQuantity} />
              <DetailRow label="Price" value={formatCurrency(item.unitPrice)} />
            </div>
          </div>

          <div>
            <SectionHeader title="Recent Transactions" size="sm" />
            <ReagentTransactionTimeline
              transactions={recentTransactions}
              lots={lots}
              stockUnit={item.stockUnit}
              onVoidAndReplace={onVoidAndReplace}
            />
          </div>
        </div>
      </ScrollArea>

      {isAdmin && (
        <div className="relative flex-shrink-0 border-t border-line-faint bg-card px-4 py-3 dark:bg-shade/15">
          <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
          <div className="flex items-center gap-2">
            <OverflowMenu
              items={[
                ...(!isArchived
                  ? [{ icon: Archive, label: 'Archive', onClick: handleArchive, warning: true }]
                  : []),
                {
                  icon: Trash2,
                  label: 'Remove',
                  onClick: () => setShowDeleteConfirm(true),
                  danger: true,
                },
              ]}
              dividerBefore={['Remove']}
              size="sm"
              aria-label="More item actions"
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ClipboardList className="h-4 w-4" />}
              onClick={onRecordTransaction}
            >
              Record Transaction
            </Button>
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
        title="Remove Item"
        message={`Are you sure you want to remove "${item.name}"? This will also remove all lots, documents, and barcodes. This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <DocumentLinkModal
        isOpen={documentModal.isOpen}
        mode={documentModal.mode}
        withDocType
        initialValues={
          documentModal.doc
            ? {
                label: documentModal.doc.label,
                url: documentModal.doc.url,
                notes: documentModal.doc.notes,
                docType: documentModal.doc.docType,
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
