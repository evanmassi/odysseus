/**
 * Barcode List
 *
 * The barcodes attached to a catalog item. Owns the print dialog, since the label it prints
 * is the item's, not the barcode's.
 */

import { useState } from 'react';

import { Edit, Printer, RefreshCw, Trash2 } from 'lucide-react';

import { Button, Chip, Input, Tooltip } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

import { BarcodePrint } from './BarcodePrint';
import { BARCODE_TYPE_LABELS } from './barcodeTypeLabels';

import type { BarcodeType } from '@odysseus/shared-schemas';

interface DisplayBarcode {
  id: string;
  barcodeValue: string;
  barcodeType: BarcodeType;
  isPrimary: boolean;
  label?: string;
}

interface BarcodeListProps {
  barcodes: DisplayBarcode[];
  itemName: string;
  manufacturer?: string;
  catalogNumber?: string;
  isAdmin: boolean;
  /** Suppresses removal only; labels and printing stay available. */
  isRemoveLocked?: boolean;
  onUpdateLabel: (barcodeId: string, label: string | null, onSuccess: () => void) => void;
  onRemove: (barcodeId: string, onSuccess: () => void) => void;
  onRegenerate: () => void;
  isSavingLabel: boolean;
  isRegenerating: boolean;
}

export function BarcodeList({
  barcodes,
  itemName,
  manufacturer,
  catalogNumber,
  isAdmin,
  isRemoveLocked = false,
  onUpdateLabel,
  onRemove,
  onRegenerate,
  isSavingLabel,
  isRegenerating,
}: BarcodeListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [printing, setPrinting] = useState<DisplayBarcode | null>(null);

  if (barcodes.length === 0) {
    return <p className="text-caption italic text-muted-foreground">No barcodes</p>;
  }

  const saveLabel = (barcodeId: string) => {
    onUpdateLabel(barcodeId, editingLabel.trim() || null, () => setEditingId(null));
  };

  return (
    <>
      <div className="space-y-1.5">
        {barcodes.map(bc => (
          <div key={bc.id}>
            {editingId === bc.id ? (
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
                    if (e.key === 'Enter') saveLabel(bc.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <Button size="xs" onClick={() => saveLabel(bc.id)} isLoading={isSavingLabel}>
                  Save
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-body-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-caption text-muted-foreground">
                    {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string should fallback to type label */}
                    {bc.label || BARCODE_TYPE_LABELS[bc.barcodeType]}:
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
                          onClick={onRegenerate}
                          isLoading={isRegenerating}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content="Print barcode" side="bottom">
                      <Button variant="ghost" size="xs" iconOnly onClick={() => setPrinting(bc)}>
                        <Printer className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit label" side="bottom">
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        onClick={() => {
                          setEditingId(bc.id);
                          setEditingLabel(bc.label ?? '');
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                    {!isRemoveLocked && (
                      <Tooltip content="Remove" side="bottom">
                        <Button
                          variant="ghost-danger"
                          size="xs"
                          iconOnly
                          onClick={() =>
                            onRemove(bc.id, () => notifications.success('Barcode removed'))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {printing && (
        <BarcodePrint
          isOpen={true}
          onClose={() => setPrinting(null)}
          barcodeValue={printing.barcodeValue}
          itemName={itemName}
          manufacturer={manufacturer}
          catalogNumber={catalogNumber}
        />
      )}
    </>
  );
}
