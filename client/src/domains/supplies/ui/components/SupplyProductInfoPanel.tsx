/**
 * Supply Product Info Panel
 *
 * Read-only detail display for a selected supply product with stock levels,
 * barcodes, documents, and admin action buttons.
 */

import { useState, useEffect, useRef, useMemo } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  Edit,
  Trash2,
  Archive,
  ExternalLink,
  Package,
  ClipboardList,
  RefreshCw,
  MapPin,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useSupplyProductDetailQuery, useSupplyLocationsQuery } from '@domains/supplies/hooks';
import {
  useDeleteSupplyProductMutation,
  useArchiveSupplyProductMutation,
  useRemoveSupplyDocumentMutation,
  useUpdateSupplyDocumentMutation,
  useRemoveSupplyBarcodeMutation,
  useUpdateSupplyBarcodeMutation,
  useRegenerateInternalBarcodeMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import { Button, InfoField, InfoGroup, Input, OverflowMenu, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyBarcodeForm } from './SupplyBarcodeForm';
import { SupplyDocumentForm } from './SupplyDocumentForm';
import { SupplyTransactionTimeline } from './SupplyTransactionTimeline';

import type { TransactionPrefill } from './SupplyTransactionForm';
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

interface SupplyProductInfoPanelProps {
  productId: string;
  onEdit: () => void;
  onRecordTransaction: () => void;
  onVoidAndReplace: (
    productId: string,
    initialTab: 'received' | 'issued' | 'count' | 'disposed',
    prefill: TransactionPrefill
  ) => void;
  onDeleted: () => void;
  categoryName?: string;
}

export function SupplyProductInfoPanel({
  productId,
  onEdit,
  onRecordTransaction,
  onVoidAndReplace,
  onDeleted,
  categoryName,
}: SupplyProductInfoPanelProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    const el = scrollRef.current?.getElement();
    if (el) el.scrollTop = 0;
  }, [productId]);

  const { data: detail } = useSupplyProductDetailQuery(productId);
  const { data: locations = [] } = useSupplyLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const deleteProductMutation = useDeleteSupplyProductMutation();
  const archiveProductMutation = useArchiveSupplyProductMutation();
  const removeDocumentMutation = useRemoveSupplyDocumentMutation();
  const updateDocumentMutation = useUpdateSupplyDocumentMutation();
  const removeBarcodeMutation = useRemoveSupplyBarcodeMutation();
  const updateBarcodeMutation = useUpdateSupplyBarcodeMutation();
  const regenerateBarcodeMutation = useRegenerateInternalBarcodeMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingBarcodeId, setEditingBarcodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocLabel, setEditingDocLabel] = useState('');
  const [editingDocUrl, setEditingDocUrl] = useState('');
  const [editingDocNotes, setEditingDocNotes] = useState('');

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const { product, documents, barcodes, stock } = detail;
  const statusConfig = STATUS_LABELS[product.status] ?? STATUS_LABELS['active'];
  const isArchived = product.status === 'archived';
  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);

  const handleDelete = async () => {
    try {
      await deleteProductMutation.mutateAsync(productId);
      notifications.success('Product removed');
      onDeleted();
    } catch {
      notifications.error('Failed to remove product');
    }
    setShowDeleteConfirm(false);
  };

  const handleArchive = async () => {
    try {
      await archiveProductMutation.mutateAsync(productId);
      notifications.success('Product archived');
      onDeleted();
    } catch {
      notifications.error('Failed to archive product');
    }
  };

  const handleRemoveDocument = async (docId: string) => {
    try {
      await removeDocumentMutation.mutateAsync({ productId, docId });
      notifications.success('Document removed');
    } catch {
      notifications.error('Failed to remove document');
    }
  };

  const handleSaveDocument = async (docId: string) => {
    if (!editingDocLabel.trim() || !editingDocUrl.trim()) return;
    try {
      await updateDocumentMutation.mutateAsync({
        productId,
        docId,
        data: {
          label: editingDocLabel.trim(),
          url: editingDocUrl.trim(),
          notes: editingDocNotes.trim() ? editingDocNotes.trim() : null,
        },
      });
      setEditingDocId(null);
    } catch {
      notifications.error('Failed to update document');
    }
  };

  const handleRemoveBarcode = async (barcodeId: string) => {
    try {
      await removeBarcodeMutation.mutateAsync({ productId, barcodeId });
      notifications.success('Barcode removed');
    } catch {
      notifications.error('Failed to remove barcode');
    }
  };

  const handleSaveBarcodeLabel = async (barcodeId: string) => {
    try {
      await updateBarcodeMutation.mutateAsync({
        productId,
        barcodeId,
        data: { label: editingLabel.trim() || null },
      });
      setEditingBarcodeId(null);
    } catch {
      notifications.error('Failed to update barcode label');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h4 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5">
          <Package size={16} className="text-secondary-foreground" />
          Product Information
        </h4>
      </div>

      <div className="bg-muted rounded-md px-3 py-2 mx-4 mb-3 flex-shrink-0 space-y-2">
        {isAdmin && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                leftIcon={<Edit className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRecordTransaction}
                leftIcon={<ClipboardList className="w-3.5 h-3.5" />}
              >
                Record Transaction
              </Button>
            </div>
            <OverflowMenu
              items={[
                ...(!isArchived
                  ? [
                      {
                        icon: Archive,
                        label: 'Archive',
                        onClick: () => void handleArchive(),
                        danger: true,
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
              aria-label="More product actions"
            />
          </div>
        )}
        <div
          className={`flex items-center gap-1.5 flex-wrap ${isAdmin ? 'pt-2 mt-2 border-t border-border' : ''}`}
        >
          {stock.map(s => {
            const locName = locationNameMap.get(s.locationId);
            return locName ? (
              <Chip key={s.locationId} color="info" size="sm" leftIcon={<MapPin />}>
                {locName}
              </Chip>
            ) : null;
          })}
          {categoryName && (
            <Chip color="info" size="sm">
              {categoryName}
            </Chip>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="px-4 pb-4 space-y-5">
          {/* Product name + status + properties */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-card-foreground font-semibold text-sm">{product.name}</span>
              <Chip color={statusConfig.color} size="sm" className="uppercase tracking-wide">
                {statusConfig.label}
              </Chip>
            </div>
            {product.properties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.properties.map(prop => (
                  <Chip key={prop} color="default" size="sm">
                    {prop}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <InfoGroup title="Product Details">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoField label="Manufacturer" value={product.manufacturer} inline={false} />
              <InfoField label="Catalog #" value={product.catalogNumber} inline={false} />
              <InfoField label="Vendor" value={product.vendorName} inline={false} />
              <InfoField
                label="Vendor Catalog #"
                value={product.vendorCatalogNumber}
                inline={false}
              />
              <InfoField label="Stock Unit" value={product.stockUnit} inline={false} />
              <InfoField label="Item" value={product.baseItemName} inline={false} />
            </div>
          </InfoGroup>

          {/* Packaging chain */}
          {detail.packagingLevels.length > 0 && (
            <InfoGroup title="Packaging">
              <div className="text-sm text-card-foreground">
                {(() => {
                  const levels = detail.packagingLevels;
                  const ordered: typeof levels = [];
                  const bottom = levels.find(l => l.parentUnit === null);
                  if (bottom) {
                    ordered.push(bottom);
                    let current = bottom;
                    for (let i = 0; i < levels.length; i++) {
                      const next = levels.find(l => l.parentUnit === current.unitName);
                      if (!next) break;
                      ordered.push(next);
                      current = next;
                    }
                  }
                  return ordered.map((level, i) => {
                    const parentName = level.parentUnit ?? product.baseItemName ?? 'item';
                    return (
                      <span key={level.id}>
                        {i > 0 && <span className="text-muted-foreground/40 mx-1.5">·</span>}
                        {level.quantity} {pluralizeUnit(parentName, level.quantity)}{' '}
                        <span className="text-muted-foreground">per</span> {level.unitName}
                      </span>
                    );
                  });
                })()}
              </div>
            </InfoGroup>
          )}

          {/* Stock levels */}
          <InfoGroup title="Stock Levels">
            {stock.length > 0 ? (
              <div className="space-y-1">
                {stock.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {locationNameMap.get(s.locationId) ?? s.locationId}
                    </span>
                    <span className="font-medium">
                      {s.quantity} {pluralizeUnit(product.stockUnit ?? 'unit', s.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                  <span>Total</span>
                  <span>
                    {totalStock} {pluralizeUnit(product.stockUnit ?? 'unit', totalStock)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No stock entries</p>
            )}
          </InfoGroup>

          {/* Current lot number */}
          {product.currentLotNumber && (
            <InfoField label="Current Lot #" value={product.currentLotNumber} inline={false} />
          )}

          {/* Barcodes */}
          <InfoGroup title="Barcodes">
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
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string should fallback to type label */}
                            {bc.label || (BARCODE_TYPE_LABELS[bc.barcodeType] ?? bc.barcodeType)}:
                          </span>
                          <span className="font-mono text-xs text-card-foreground">
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
                                  onClick={() =>
                                    void regenerateBarcodeMutation.mutateAsync(productId)
                                  }
                                  isLoading={regenerateBarcodeMutation.isPending}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              </Tooltip>
                            )}
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
                                <Edit className="w-3 h-3" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Remove" side="bottom">
                              <Button
                                variant="ghost-danger"
                                size="xs"
                                iconOnly
                                onClick={() => void handleRemoveBarcode(bc.id)}
                              >
                                <Trash2 className="w-3 h-3" />
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
              <p className="text-xs text-muted-foreground italic">No barcodes</p>
            )}
            {isAdmin && (
              <div className="mt-2">
                <SupplyBarcodeForm productId={productId} onAdded={() => {}} />
              </div>
            )}
          </InfoGroup>

          {/* Documents */}
          <InfoGroup title="Documents">
            {documents.length > 0 ? (
              <div className="space-y-1.5">
                {documents.map(doc => (
                  <div key={doc.id}>
                    {editingDocId === doc.id ? (
                      <div className="space-y-1.5 p-2 border border-border rounded-md">
                        <Input
                          type="text"
                          value={editingDocLabel}
                          onValueChange={setEditingDocLabel}
                          placeholder="Label"
                          size="sm"
                          fullWidth
                        />
                        <Input
                          type="text"
                          value={editingDocUrl}
                          onValueChange={setEditingDocUrl}
                          placeholder="URL"
                          size="sm"
                          fullWidth
                        />
                        <Input
                          type="text"
                          value={editingDocNotes}
                          onValueChange={setEditingDocNotes}
                          placeholder="Notes (optional)"
                          size="sm"
                          fullWidth
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="xs" onClick={() => setEditingDocId(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            onClick={() => void handleSaveDocument(doc.id)}
                            disabled={!editingDocLabel.trim() || !editingDocUrl.trim()}
                            isLoading={updateDocumentMutation.isPending}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {doc.label}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5">
                              <Tooltip content="Edit" side="bottom">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  iconOnly
                                  onClick={() => {
                                    setEditingDocId(doc.id);
                                    setEditingDocLabel(doc.label);
                                    setEditingDocUrl(doc.url);
                                    setEditingDocNotes(doc.notes ?? '');
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Remove" side="bottom">
                                <Button
                                  variant="ghost-danger"
                                  size="xs"
                                  iconOnly
                                  onClick={() => void handleRemoveDocument(doc.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No documents</p>
            )}
            {isAdmin && <SupplyDocumentForm productId={productId} onAdded={() => {}} />}
          </InfoGroup>

          {/* Description */}
          {product.description && (
            <InfoGroup title="Description">
              <p className="text-sm text-card-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </InfoGroup>
          )}

          {/* Notes */}
          {product.notes && (
            <InfoGroup title="Notes">
              <p className="text-sm text-card-foreground whitespace-pre-wrap">{product.notes}</p>
            </InfoGroup>
          )}

          {/* Reorder settings */}
          <InfoGroup title="Reorder Settings">
            <div className="grid grid-cols-4 gap-x-3">
              <InfoField
                label="Threshold"
                value={product.reorderThreshold?.toString()}
                inline={false}
              />
              <InfoField label="Qty" value={product.reorderQuantity?.toString()} inline={false} />
              <InfoField label="Unit" value={product.reorderUnit} inline={false} />
              <InfoField label="Price" value={formatCurrency(product.unitPrice)} inline={false} />
            </div>
          </InfoGroup>

          {/* Transaction history */}
          <InfoGroup title="Recent Transactions">
            <SupplyTransactionTimeline
              transactions={detail.recentTransactions}
              stockUnit={product.stockUnit}
              onVoidAndReplace={onVoidAndReplace}
            />
          </InfoGroup>
        </div>
      </ScrollArea>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        variant="danger"
        title="Remove Product"
        message={`Are you sure you want to remove "${product.name}"? This will also remove all documents, barcodes, and stock entries. This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
