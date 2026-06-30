/**
 * Supply Item Info Panel
 *
 * Read-only detail display for a selected supply item with stock levels,
 * barcodes, documents, and admin action buttons.
 */

import { useState, useEffect, useRef, useMemo } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  Edit,
  Trash2,
  Archive,
  ExternalLink,
  ClipboardList,
  RefreshCw,
  MapPin,
  Printer,
  FolderOpen,
  NotepadText,
  SquarePen,
  Plus,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useSupplyItemDetailQuery, useSupplyLocationsQuery } from '@domains/supplies/hooks';
import {
  useDeleteSupplyItemMutation,
  useArchiveSupplyItemMutation,
  useAddSupplyDocumentMutation,
  useRemoveSupplyDocumentMutation,
  useUpdateSupplyDocumentMutation,
  useRemoveSupplyBarcodeMutation,
  useUpdateSupplyBarcodeMutation,
  useRegenerateInternalBarcodeMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import {
  Button,
  Chip,
  DetailRow,
  HeaderStrip,
  Input,
  NubDivider,
  OverflowMenu,
  PanelHeader,
  SectionHeader,
  Tooltip,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import {
  DocumentLinkModal,
  type DocumentLinkValues,
} from '@shared/ui/components/overlays/DocumentLinkModal';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyBarcodeForm } from './SupplyBarcodeForm';
import { SupplyBarcodePrint } from './SupplyBarcodePrint';
import { SupplyTransactionTimeline } from './SupplyTransactionTimeline';

import type { TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyBarcode, SupplyDocument } from '@odysseus/shared-schemas';
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react';

const STATUS_LABELS: Record<
  string,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};

const BARCODE_TYPE_LABELS: Record<string, string> = {
  internal: 'Internal',
  manufacturer_sku: 'Mfr SKU',
  upc: 'UPC',
};

interface SupplyItemInfoPanelProps {
  itemId: string;
  onEdit: () => void;
  onRecordTransaction: () => void;
  onVoidAndReplace: (
    itemId: string,
    initialTab: 'received' | 'issued' | 'count' | 'disposed',
    prefill: TransactionPrefill
  ) => void;
  onDeleted: () => void;
  categoryName?: string;
}

function StripLabel({ children }: { children: string }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
      <span
        aria-hidden
        className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
      />
      {children}
    </span>
  );
}

export function SupplyItemInfoPanel({
  itemId,
  onEdit,
  onRecordTransaction,
  onVoidAndReplace,
  onDeleted,
  categoryName,
}: SupplyItemInfoPanelProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    const el = scrollRef.current?.getElement();
    if (el) el.scrollTop = 0;
  }, [itemId]);

  const { data: detail } = useSupplyItemDetailQuery(itemId);
  const { data: locations = [] } = useSupplyLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const deleteItemMutation = useDeleteSupplyItemMutation();
  const archiveItemMutation = useArchiveSupplyItemMutation();
  const addDocumentMutation = useAddSupplyDocumentMutation();
  const removeDocumentMutation = useRemoveSupplyDocumentMutation();
  const updateDocumentMutation = useUpdateSupplyDocumentMutation();
  const removeBarcodeMutation = useRemoveSupplyBarcodeMutation();
  const updateBarcodeMutation = useUpdateSupplyBarcodeMutation();
  const regenerateBarcodeMutation = useRegenerateInternalBarcodeMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingBarcodeId, setEditingBarcodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [printingBarcode, setPrintingBarcode] = useState<SupplyBarcode | null>(null);
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    doc?: SupplyDocument;
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

  const { item, documents, barcodes, stock } = detail;
  const statusConfig = STATUS_LABELS[item.status] ?? STATUS_LABELS['active'];
  const isArchived = item.status === 'archived';
  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);

  const locationChips = stock
    .map(s => ({ id: s.locationId, name: locationNameMap.get(s.locationId) }))
    .filter((l): l is { id: string; name: string } => !!l.name);

  const thresholdNode =
    item.reorderThreshold != null ? (
      <span>
        {(() => {
          if (!item.reorderThresholdUnit || item.reorderThresholdUnit === item.stockUnit) {
            return `${item.reorderThreshold} ${pluralizeUnit(item.stockUnit ?? 'unit', item.reorderThreshold)}`;
          }
          const levels = detail.packagingLevels;
          let multiplier = 1;
          let current = item.reorderThresholdUnit;
          for (let i = 0; i < levels.length + 1; i++) {
            const level = levels.find(l => l.unitName === current);
            if (!level) break;
            multiplier *= level.quantity;
            if (level.parentUnit === null || level.parentUnit === item.stockUnit) break;
            current = level.parentUnit;
          }
          const inputQty = Math.round(item.reorderThreshold / multiplier);
          return `${inputQty} ${pluralizeUnit(item.reorderThresholdUnit, inputQty)}`;
        })()}
        {item.reorderThresholdUnit && item.reorderThresholdUnit !== item.stockUnit && (
          <span className="ml-1 text-caption text-muted-foreground">
            ({item.reorderThreshold}{' '}
            {pluralizeUnit(item.stockUnit ?? 'unit', item.reorderThreshold)})
          </span>
        )}
      </span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  const handleDelete = async () => {
    try {
      await deleteItemMutation.mutateAsync(itemId);
      notifications.success('Item removed');
      onDeleted();
    } catch {
      notifications.error('Failed to remove item');
    }
    setShowDeleteConfirm(false);
  };

  const handleArchive = async () => {
    try {
      await archiveItemMutation.mutateAsync(itemId);
      notifications.success('Item archived');
      onDeleted();
    } catch {
      notifications.error('Failed to archive item');
    }
  };

  const handleRemoveDocument = async (docId: string) => {
    try {
      await removeDocumentMutation.mutateAsync({ itemId, docId });
      notifications.success('Document removed');
    } catch {
      notifications.error('Failed to remove document');
    }
  };

  const handleSaveDocument = async (values: DocumentLinkValues) => {
    if (documentModal.mode === 'edit' && documentModal.doc) {
      try {
        await updateDocumentMutation.mutateAsync({
          itemId,
          docId: documentModal.doc.id,
          data: { label: values.label, url: values.url, notes: values.notes ?? null },
        });
        notifications.success('Document updated');
      } catch (error) {
        notifications.error('Failed to update document');
        throw error;
      }
    } else {
      try {
        await addDocumentMutation.mutateAsync({
          itemId,
          data: { label: values.label, url: values.url, notes: values.notes },
        });
        notifications.success('Document added');
      } catch (error) {
        notifications.error('Failed to add document');
        throw error;
      }
    }
  };

  const handleRemoveBarcode = async (barcodeId: string) => {
    try {
      await removeBarcodeMutation.mutateAsync({ itemId, barcodeId });
      notifications.success('Barcode removed');
    } catch {
      notifications.error('Failed to remove barcode');
    }
  };

  const handleSaveBarcodeLabel = async (barcodeId: string) => {
    try {
      await updateBarcodeMutation.mutateAsync({
        itemId,
        barcodeId,
        data: { label: editingLabel.trim() || null },
      });
      setEditingBarcodeId(null);
    } catch {
      notifications.error('Failed to update barcode label');
    }
  };

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<NotepadText className="h-4 w-4" />} title="Supply Information" />
      </div>

      <HeaderStrip className="px-4 py-2.5">
        <div className="grid grid-cols-[auto_1fr] items-center justify-items-start gap-x-3 gap-y-2">
          <StripLabel>Status</StripLabel>
          <Chip size="sm" color={statusConfig.color}>
            {statusConfig.label}
          </Chip>
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
                {locationChips.map(loc => (
                  <Chip key={loc.id} size="sm" color="info" lead={<MapPin />}>
                    {loc.name}
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
            {item.properties.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.properties.map(prop => (
                  <Chip key={prop} color="default" size="sm">
                    {prop}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Item Details" size="sm" />
            <div>
              <DetailRow label="Manufacturer" value={item.manufacturer} />
              <DetailRow label="Catalog #" value={item.catalogNumber} />
              <DetailRow label="Vendor" value={item.vendorName} />
              <DetailRow label="Vendor Catalog #" value={item.vendorCatalogNumber} />
              <DetailRow label="Stock Unit" value={item.stockUnit} />
              <DetailRow label="Item" value={item.baseItemName} />
            </div>
          </div>

          {detail.packagingLevels.length > 0 && (
            <div>
              <SectionHeader title="Packaging" size="sm" />
              {(() => {
                // Walk the chain base-up, accumulating the running base-unit total so
                // each tier can show the multiplicative scale the flat text hid.
                const levels = detail.packagingLevels;
                const bottomUp: typeof levels = [];
                const bottom = levels.find(l => l.parentUnit === null);
                if (bottom) {
                  bottomUp.push(bottom);
                  let current = bottom;
                  for (let i = 0; i < levels.length; i++) {
                    const next = levels.find(l => l.parentUnit === current.unitName);
                    if (!next) break;
                    bottomUp.push(next);
                    current = next;
                  }
                }
                const baseName = item.baseItemName ?? item.stockUnit ?? 'unit';
                let running = 1;
                const tiers = bottomUp.map(level => {
                  running *= level.quantity;
                  const childUnit = level.parentUnit ?? baseName;
                  return {
                    id: level.id,
                    name: level.unitName,
                    contains: `${level.quantity} ${pluralizeUnit(childUnit, level.quantity)}`,
                    roll: running,
                  };
                });
                // Largest unit on top; base unit as the final rung.
                const rows = [
                  ...tiers.slice().reverse(),
                  { id: '__base__', name: baseName, contains: 'base unit', roll: 1 },
                ];

                return (
                  <div className="border border-line-soft">
                    {rows.map((row, i) => {
                      const toned = i === 0;
                      return (
                        <div
                          key={row.id}
                          className={`grid grid-cols-[1fr_1.3fr_auto] items-center gap-4 px-4 py-3 ${
                            i < rows.length - 1 ? 'border-b border-line-faint' : ''
                          } ${toned ? 'bg-primary/[0.06]' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              aria-hidden
                              className={`h-4 w-[3px] flex-shrink-0 ${
                                toned ? 'bg-primary' : 'bg-muted-foreground/30'
                              }`}
                            />
                            <span className="font-display text-body-sm capitalize text-card-foreground">
                              {row.name}
                            </span>
                          </div>
                          <span className="font-mono text-data-sm tracking-[0.04em] text-muted-foreground">
                            contains {row.contains}
                          </span>
                          <span
                            className={`text-right font-mono text-data-sm tracking-[0.04em] ${
                              toned ? 'text-primary' : 'text-foreground/70'
                            }`}
                          >
                            {row.roll.toLocaleString()}
                            <span className="ml-1 text-label-2xs text-foreground/40">
                              {pluralizeUnit(baseName, row.roll)}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <SectionHeader title="Stock Levels" size="sm" />
            {stock.length > 0 ? (
              <div className="space-y-1">
                {stock.map(s => (
                  <div key={s.id} className="flex justify-between text-body-sm">
                    <span className="text-muted-foreground">
                      {locationNameMap.get(s.locationId) ?? s.locationId}
                    </span>
                    <span className="font-medium">
                      {s.quantity} {pluralizeUnit(item.stockUnit ?? 'unit', s.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-1 text-body-sm font-semibold">
                  <span>Total</span>
                  <span>
                    {totalStock} {pluralizeUnit(item.stockUnit ?? 'unit', totalStock)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-caption italic text-muted-foreground">No stock entries</p>
            )}
          </div>

          {item.currentLotNumber && (
            <DetailRow label="Current Lot #" value={item.currentLotNumber} />
          )}

          <div>
            <SectionHeader title="Barcodes" size="sm" />
            {barcodes.length > 0 ? (
              <div className="space-y-1.5">
                {barcodes.map(bc => (
                  <div key={bc.id}>
                    {editingBarcodeId === bc.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          value={editingLabel}
                          onValueChange={setEditingLabel}
                          placeholder="Label (e.g., Fisher Cat #)"
                          size="sm"
                          fullWidth
                          /* eslint-disable-next-line jsx-a11y/no-autofocus -- Inline edit: user-initiated, focus is expected */
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleSaveBarcodeLabel(bc.id);
                            if (e.key === 'Escape') setEditingBarcodeId(null);
                          }}
                        />
                        <Button
                          size="xs"
                          onClick={() => void handleSaveBarcodeLabel(bc.id)}
                          isLoading={updateBarcodeMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setEditingBarcodeId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-body-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-caption text-muted-foreground">
                            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string should fallback to type label */}
                            {bc.label || (BARCODE_TYPE_LABELS[bc.barcodeType] ?? bc.barcodeType)}:
                          </span>
                          <span className="font-mono text-data-sm text-card-foreground">
                            {bc.barcodeValue}
                          </span>
                          {bc.isPrimary && (
                            <Chip color="info" size="xs">
                              Primary
                            </Chip>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-0.5">
                            {bc.barcodeType === 'internal' && (
                              <Tooltip content="Regenerate internal barcode" side="bottom">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  iconOnly
                                  onClick={() => void regenerateBarcodeMutation.mutateAsync(itemId)}
                                  isLoading={regenerateBarcodeMutation.isPending}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </Tooltip>
                            )}
                            <Tooltip content="Print barcode" side="bottom">
                              <Button
                                variant="ghost"
                                size="xs"
                                iconOnly
                                onClick={() => setPrintingBarcode(bc)}
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Edit label" side="bottom">
                              <Button
                                variant="ghost"
                                size="xs"
                                iconOnly
                                onClick={() => {
                                  setEditingBarcodeId(bc.id);
                                  setEditingLabel(bc.label ?? '');
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Remove" side="bottom">
                              <Button
                                variant="ghost-danger"
                                size="xs"
                                iconOnly
                                onClick={() => void handleRemoveBarcode(bc.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption italic text-muted-foreground">No barcodes</p>
            )}
            {isAdmin && (
              <div className="mt-2">
                <SupplyBarcodeForm itemId={itemId} onAdded={() => {}} />
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
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {doc.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
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
                              onClick={() => void handleRemoveDocument(doc.id)}
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
              <DetailRow label="Threshold">{thresholdNode}</DetailRow>
              <DetailRow
                label="Reorder Qty"
                value={
                  item.reorderQuantity != null
                    ? `${item.reorderQuantity} ${item.reorderUnit ? pluralizeUnit(item.reorderUnit, item.reorderQuantity) : ''}`
                    : undefined
                }
              />
              <DetailRow label="Price" value={formatCurrency(item.unitPrice)} />
            </div>
          </div>

          <div>
            <SectionHeader title="Recent Transactions" size="sm" />
            <SupplyTransactionTimeline
              transactions={detail.recentTransactions}
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
                  ? [
                      {
                        icon: Archive,
                        label: 'Archive',
                        onClick: () => void handleArchive(),
                        warning: true,
                      },
                    ]
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
        message={`Are you sure you want to remove "${item.name}"? This will also remove all documents, barcodes, and stock entries. This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {printingBarcode && (
        <SupplyBarcodePrint
          isOpen={true}
          onClose={() => setPrintingBarcode(null)}
          barcodeValue={printingBarcode.barcodeValue}
          itemName={item.name}
          manufacturer={item.manufacturer}
          catalogNumber={item.catalogNumber}
        />
      )}

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
