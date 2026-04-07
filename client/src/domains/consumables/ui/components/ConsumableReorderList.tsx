/**
 * Consumable Reorder List
 *
 * Full reorder list modal with all products below threshold and CSV export.
 */

import { useCallback } from 'react';

import { Download, ShoppingCart } from 'lucide-react';

import { httpClient } from '@infra/api';
import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { downloadBlob } from '@shared/utils/downloadBlob';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';

import type { ConsumableProductWithStock } from '@odysseus/shared-schemas';

interface ConsumableReorderListProps {
  isOpen: boolean;
  onClose: () => void;
  products: ConsumableProductWithStock[];
}

export function ConsumableReorderList({ isOpen, onClose, products }: ConsumableReorderListProps) {
  const handleExportCsv = useCallback(async () => {
    try {
      const blob = await httpClient.getBlob('/admin/export/consumable-reorder-list?format=csv');
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `odysseus-consumable-reorder-list-${date}.csv`);
    } catch {
      notifications.error('Failed to export reorder list');
    }
  }, []);

  return (
    <BaseModal isOpen={isOpen} title="Reorder List" icon={<ShoppingCart size={24} />} onClose={onClose} size="lg" fixedHeight>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? 's' : ''} below reorder threshold
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleExportCsv()}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 font-medium text-muted-foreground">Product</th>
                  <th className="py-2 font-medium text-muted-foreground">Manufacturer</th>
                  <th className="py-2 font-medium text-muted-foreground">Cat #</th>
                  <th className="py-2 font-medium text-muted-foreground">Vendor</th>
                  <th className="py-2 font-medium text-muted-foreground text-right">Stock</th>
                  <th className="py-2 font-medium text-muted-foreground text-right">Reorder</th>
                  <th className="py-2 font-medium text-muted-foreground text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-border/50">
                    <td className="py-2 font-medium text-card-foreground">{product.name}</td>
                    <td className="py-2 text-muted-foreground">{product.manufacturer ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{product.catalogNumber ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{product.vendorName ?? '—'}</td>
                    <td className={`py-2 text-right font-medium ${product.totalStock <= 0 ? 'text-danger-text' : 'text-warning-text'}`}>
                      {product.totalStock} {product.stockUnit ?? ''}
                    </td>
                    <td className="py-2 text-right">
                      {product.reorderQuantity ?? '—'} {product.reorderUnit ?? product.stockUnit ?? ''}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatCurrency(product.unitPrice) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    </BaseModal>
  );
}
