/**
 * Bulk Print Tab
 *
 * Right-panel configuration for printing barcode labels onto standard label
 * sheets. Opens SupplyBarcodeSheetModal for full-sheet preview and print.
 */

import { useCallback, useMemo, useState } from 'react';

import { Printer } from 'lucide-react';

import { SupplyService } from '@domains/supplies/services/SupplyService';
import { Button, Select } from '@shared/ui';
import { NumberInput } from '@shared/ui/primitives/input/NumberInput';
import { notifications } from '@shared/utils/notifications';

import {
  DEFAULT_TEMPLATE_ID,
  SHEET_TEMPLATES,
  getTemplateById,
  type SheetTemplate,
} from '../sheetTemplates';
import { FORMAT_OPTIONS, type BarcodeFormat } from '../SupplyBarcodePrint';
import { SupplyBarcodeSheetModal } from '../SupplyBarcodeSheetModal';

import type { PrintableLabel } from '../supplyBarcodeSheetTypes';
import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

const SELECTED_CLASS =
  'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md';
const UNSELECTED_CLASS =
  'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10';

const PAPER_ORDER: Record<SheetTemplate['paperSize'], number> = { letter: 0, a4: 1 };

const TEMPLATE_OPTIONS: SelectOption[] = [...SHEET_TEMPLATES]
  .sort(
    (a, b) => PAPER_ORDER[a.paperSize] - PAPER_ORDER[b.paperSize] || a.name.localeCompare(b.name)
  )
  .map(t => ({ value: t.id, label: t.name, description: t.description }));

interface BulkPrintTabProps {
  items: SupplyItemWithStock[];
  selectedIds: Set<string>;
}

export function BulkPrintTab({ items, selectedIds }: BulkPrintTabProps) {
  const [format, setFormat] = useState<BarcodeFormat>('1d');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [startingPosition, setStartingPosition] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printableLabels, setPrintableLabels] = useState<PrintableLabel[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentTemplate = useMemo(
    () => getTemplateById(templateId) ?? SHEET_TEMPLATES[0],
    [templateId]
  );
  const slotsPerSheet = currentTemplate.columns * currentTemplate.rows;

  const handleTemplateChange = useCallback(
    (value: string | number | (string | number)[] | null) => {
      const nextId = String(value ?? DEFAULT_TEMPLATE_ID);
      setTemplateId(nextId);
      const nextTemplate = getTemplateById(nextId) ?? SHEET_TEMPLATES[0];
      setStartingPosition(prev => Math.min(prev, nextTemplate.columns * nextTemplate.rows));
    },
    []
  );

  const handlePreviewPrint = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await SupplyService.bulkGetBarcodes(Array.from(selectedIds));
      const itemMap = new Map(items.map(i => [i.id, i]));
      const labels: PrintableLabel[] = [];
      for (const b of response.barcodes) {
        if (b.barcodeValue === null) continue;
        // Filter orphans — item could have been deleted between selection and print click.
        const item = itemMap.get(b.itemId);
        if (!item) continue;
        labels.push({
          itemId: b.itemId,
          itemName: item.name,
          manufacturer: item.manufacturer,
          catalogNumber: item.catalogNumber,
          barcodeValue: b.barcodeValue,
        });
      }
      if (labels.length === 0) {
        notifications.warning('No primary barcodes found for the selected items');
        setIsLoading(false);
        return;
      }
      setPrintableLabels(labels);
      setIsPreviewOpen(true);
    } catch {
      notifications.error('Failed to fetch barcodes');
      setIsLoading(false);
    }
  }, [items, selectedIds]);

  const handleClose = useCallback(() => {
    setIsPreviewOpen(false);
    setPrintableLabels(null);
    setIsLoading(false);
  }, []);

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Print barcodes for {selectedIds.size} selected item{selectedIds.size === 1 ? '' : 's'}{' '}
          onto a standard label sheet.
        </p>

        <div>
          <h4 className="text-sm font-semibold text-card-foreground mb-2">Format</h4>
          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map(({ value, label, Icon }) => {
              const isSelected = format === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value)}
                  className={`px-3 py-2 rounded-lg border-2 text-center transition-all flex items-center justify-center gap-2 ${
                    isSelected ? SELECTED_CLASS : UNSELECTED_CLASS
                  }`}
                >
                  <Icon
                    size={18}
                    className={isSelected ? 'text-white' : 'text-secondary-foreground'}
                  />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Select
          label="Sheet template"
          options={TEMPLATE_OPTIONS}
          value={templateId}
          onChange={handleTemplateChange}
          fullWidth
        />

        <div>
          <h4 className="text-sm font-semibold text-card-foreground mb-2">Starting position</h4>
          <div className="flex items-center gap-2">
            <NumberInput
              value={startingPosition}
              onChange={setStartingPosition}
              min={1}
              max={slotsPerSheet}
              aria-label="Starting slot on first sheet"
            />
            <span className="text-xs text-muted-foreground">
              of {slotsPerSheet} slots ({currentTemplate.columns} × {currentTemplate.rows})
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => void handlePreviewPrint()}
            disabled={selectedIds.size === 0 || isLoading}
            isLoading={isLoading}
            leftIcon={<Printer size={16} />}
          >
            Preview & Print ({selectedIds.size})
          </Button>
        </div>
      </div>

      {isPreviewOpen && printableLabels && (
        <SupplyBarcodeSheetModal
          isOpen={isPreviewOpen}
          onClose={handleClose}
          labels={printableLabels}
          template={currentTemplate}
          startingPosition={startingPosition}
          format={format}
        />
      )}
    </>
  );
}
