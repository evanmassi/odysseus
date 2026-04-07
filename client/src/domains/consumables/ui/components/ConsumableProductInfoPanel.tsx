/**
 * Consumable Product Info Panel
 *
 * Read-only detail display for a selected consumable product with stock levels,
 * barcodes, documents, and admin action buttons.
 */

import { useState, useEffect, useRef, useMemo } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Edit, Trash2, Archive, Plus, ExternalLink, Package, ClipboardList } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import {
  useConsumableProductDetailQuery,
  useConsumableLocationsQuery,
} from '@domains/consumables/hooks';
import {
  useDeleteConsumableProductMutation,
  useArchiveConsumableProductMutation,
  useRemoveConsumableDocumentMutation,
  useRemoveConsumableBarcodeMutation,
} from '@domains/consumables/hooks/useConsumableMutations';
import { Button, InfoField, InfoGroup } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';

import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react';

const STATUS_LABELS: Record<
  string,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};

interface ConsumableProductInfoPanelProps {
  productId: string;
  onEdit: () => void;
  onRecordTransaction: () => void;
  onDeleted: () => void;
  categoryName?: string;
}

export function ConsumableProductInfoPanel({
  productId,
  onEdit,
  onRecordTransaction,
  onDeleted,
  categoryName,
}: ConsumableProductInfoPanelProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    const el = scrollRef.current?.getElement();
    if (el) el.scrollTop = 0;
  }, [productId]);

  const { data: detail } = useConsumableProductDetailQuery(productId);
  const { data: locations = [] } = useConsumableLocationsQuery();
  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const deleteProductMutation = useDeleteConsumableProductMutation();
  const archiveProductMutation = useArchiveConsumableProductMutation();
  const removeDocumentMutation = useRemoveConsumableDocumentMutation();
  const removeBarcodeMutation = useRemoveConsumableBarcodeMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleRemoveBarcode = async (barcodeId: string) => {
    try {
      await removeBarcodeMutation.mutateAsync({ productId, barcodeId });
      notifications.success('Barcode removed');
    } catch {
      notifications.error('Failed to remove barcode');
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
            {!isArchived && (
              <Button
                variant="ghost-danger"
                size="sm"
                onClick={() => void handleArchive()}
                leftIcon={<Archive className="w-3.5 h-3.5" />}
              >
                Archive
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
          {categoryName && (
            <Chip color="info" size="sm">
              {categoryName}
            </Chip>
          )}
          <Chip color={statusConfig.color} size="sm">
            {statusConfig.label}
          </Chip>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="px-4 pb-4 space-y-5">
          {/* Product name */}
          <h3 className="text-lg font-bold text-card-foreground">{product.name}</h3>

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
              <InfoField
                label="Units per Stock Unit"
                value={product.unitsPerStockUnit?.toString()}
                inline={false}
              />
            </div>
          </InfoGroup>

          {/* Properties */}
          {product.properties.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground mb-1.5">Properties</h5>
              <div className="flex flex-wrap gap-1">
                {product.properties.map(prop => (
                  <Chip key={prop} color="default" size="sm">
                    {prop}
                  </Chip>
                ))}
              </div>
            </div>
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
                      {s.quantity} {product.stockUnit ?? 'units'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                  <span>Total</span>
                  <span>
                    {totalStock} {product.stockUnit ?? 'units'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No stock entries</p>
            )}
          </InfoGroup>

          {/* Reorder settings */}
          <InfoGroup title="Reorder Settings">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoField
                label="Threshold"
                value={product.reorderThreshold?.toString()}
                inline={false}
              />
              <InfoField
                label="Reorder Qty"
                value={product.reorderQuantity?.toString()}
                inline={false}
              />
              <InfoField label="Reorder Unit" value={product.reorderUnit} inline={false} />
              <InfoField
                label="Unit Price"
                value={formatCurrency(product.unitPrice)}
                inline={false}
              />
            </div>
          </InfoGroup>

          {/* Current lot number */}
          {product.currentLotNumber && (
            <InfoField label="Current Lot #" value={product.currentLotNumber} inline={false} />
          )}

          {/* Barcodes */}
          <InfoGroup title="Barcodes">
            {barcodes.length > 0 ? (
              <div className="space-y-1">
                {barcodes.map(bc => (
                  <div key={bc.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{bc.barcodeValue}</span>
                      <Chip color="default" size="sm">
                        {bc.barcodeType.replace('_', ' ')}
                      </Chip>
                      {bc.isPrimary && (
                        <Chip color="info" size="sm">
                          Primary
                        </Chip>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="text-xs text-danger-text hover:underline"
                        onClick={() => void handleRemoveBarcode(bc.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No barcodes</p>
            )}
          </InfoGroup>

          {/* Documents */}
          <InfoGroup title="Documents">
            {documents.length > 0 ? (
              <div className="space-y-1">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between text-sm">
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
                      <button
                        type="button"
                        className="text-xs text-danger-text hover:underline"
                        onClick={() => void handleRemoveDocument(doc.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No documents</p>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Add Document
              </Button>
            )}
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

          {/* Transaction history placeholder — Phase 9 */}
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
