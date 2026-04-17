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

const CUSTOM_TEMPLATE_ID = 'custom';

const TEMPLATE_OPTIONS: SelectOption[] = [
  ...SHEET_TEMPLATES.slice()
    .sort(
      (a, b) => PAPER_ORDER[a.paperSize] - PAPER_ORDER[b.paperSize] || a.name.localeCompare(b.name)
    )
    .map(t => ({ value: t.id, label: t.name, description: t.description })),
  { value: CUSTOM_TEMPLATE_ID, label: 'Custom', description: 'User-defined layout' },
];

const PAPER_SIZE_OPTIONS: SelectOption[] = [
  { value: 'letter', label: 'US Letter (8.5 × 11 in)' },
  { value: 'a4', label: 'A4 (8.27 × 11.69 in)' },
];

const PAPER_DIMENSIONS: Record<SheetTemplate['paperSize'], { width: number; height: number }> = {
  letter: { width: 8.5, height: 11 },
  a4: { width: 8.27, height: 11.69 },
};

interface CustomTemplateInputs {
  paperSize: SheetTemplate['paperSize'];
  labelWidth: number;
  labelHeight: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  columnGap: number;
  rowGap: number;
}

const DEFAULT_CUSTOM_INPUTS: CustomTemplateInputs = {
  paperSize: 'letter',
  labelWidth: 2.625,
  labelHeight: 1,
  columns: 3,
  rows: 10,
  marginTop: 0.5,
  marginLeft: 0.1875,
  columnGap: 0.125,
  rowGap: 0,
};

function validateCustomTemplate(inputs: CustomTemplateInputs): string | null {
  const paper = PAPER_DIMENSIONS[inputs.paperSize];
  const usedWidth =
    inputs.marginLeft +
    inputs.columns * inputs.labelWidth +
    (inputs.columns - 1) * inputs.columnGap;
  const usedHeight =
    inputs.marginTop + inputs.rows * inputs.labelHeight + (inputs.rows - 1) * inputs.rowGap;
  if (usedWidth > paper.width + 1e-6) {
    return `Layout exceeds paper width (${usedWidth.toFixed(2)}in > ${paper.width}in)`;
  }
  if (usedHeight > paper.height + 1e-6) {
    return `Layout exceeds paper height (${usedHeight.toFixed(2)}in > ${paper.height}in)`;
  }
  return null;
}

function buildCustomTemplate(inputs: CustomTemplateInputs): SheetTemplate {
  const paper = PAPER_DIMENSIONS[inputs.paperSize];
  return {
    id: CUSTOM_TEMPLATE_ID,
    name: 'Custom',
    description: 'User-defined layout',
    paperSize: inputs.paperSize,
    paperWidth: paper.width,
    paperHeight: paper.height,
    labelWidth: inputs.labelWidth,
    labelHeight: inputs.labelHeight,
    columns: inputs.columns,
    rows: inputs.rows,
    marginTop: inputs.marginTop,
    marginLeft: inputs.marginLeft,
    columnGap: inputs.columnGap,
    rowGap: inputs.rowGap,
  };
}

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
  const [customInputs, setCustomInputs] = useState<CustomTemplateInputs>(DEFAULT_CUSTOM_INPUTS);

  const isCustom = templateId === CUSTOM_TEMPLATE_ID;

  const customTemplate = useMemo(
    () => (isCustom ? buildCustomTemplate(customInputs) : null),
    [isCustom, customInputs]
  );
  const customError = useMemo(
    () => (isCustom ? validateCustomTemplate(customInputs) : null),
    [isCustom, customInputs]
  );

  const currentTemplate = useMemo(() => {
    if (isCustom && customTemplate) return customTemplate;
    return getTemplateById(templateId) ?? SHEET_TEMPLATES[0];
  }, [isCustom, templateId, customTemplate]);
  const slotsPerSheet = currentTemplate.columns * currentTemplate.rows;

  const handleTemplateChange = useCallback(
    (value: string | number | (string | number)[] | null) => {
      const nextId = String(value ?? DEFAULT_TEMPLATE_ID);
      setTemplateId(nextId);
      if (nextId === CUSTOM_TEMPLATE_ID) {
        setStartingPosition(prev => Math.min(prev, customInputs.columns * customInputs.rows));
        return;
      }
      const nextTemplate = getTemplateById(nextId) ?? SHEET_TEMPLATES[0];
      setStartingPosition(prev => Math.min(prev, nextTemplate.columns * nextTemplate.rows));
    },
    [customInputs.columns, customInputs.rows]
  );

  const updateCustomInput = useCallback(
    <K extends keyof CustomTemplateInputs>(field: K, value: CustomTemplateInputs[K]) => {
      setCustomInputs(prev => {
        const next = { ...prev, [field]: value };
        // Keep startingPosition in bounds if the grid shrinks.
        if (field === 'columns' || field === 'rows') {
          setStartingPosition(sp => Math.min(sp, next.columns * next.rows));
        }
        return next;
      });
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

        {isCustom && (
          <div className="space-y-3 p-3 rounded-md border border-border bg-muted/20">
            <Select
              label="Paper size"
              options={PAPER_SIZE_OPTIONS}
              value={customInputs.paperSize}
              onChange={v =>
                updateCustomInput('paperSize', String(v ?? 'letter') as SheetTemplate['paperSize'])
              }
              fullWidth
            />
            <div className="grid grid-cols-2 gap-3">
              <CustomField
                label="Label width (in)"
                value={customInputs.labelWidth}
                onChange={v => updateCustomInput('labelWidth', v)}
                allowDecimals
                min={0.1}
                step={0.125}
              />
              <CustomField
                label="Label height (in)"
                value={customInputs.labelHeight}
                onChange={v => updateCustomInput('labelHeight', v)}
                allowDecimals
                min={0.1}
                step={0.125}
              />
              <CustomField
                label="Columns"
                value={customInputs.columns}
                onChange={v => updateCustomInput('columns', v)}
                min={1}
                step={1}
              />
              <CustomField
                label="Rows"
                value={customInputs.rows}
                onChange={v => updateCustomInput('rows', v)}
                min={1}
                step={1}
              />
              <CustomField
                label="Margin top (in)"
                value={customInputs.marginTop}
                onChange={v => updateCustomInput('marginTop', v)}
                allowDecimals
                min={0}
                step={0.125}
              />
              <CustomField
                label="Margin left (in)"
                value={customInputs.marginLeft}
                onChange={v => updateCustomInput('marginLeft', v)}
                allowDecimals
                min={0}
                step={0.125}
              />
              <CustomField
                label="Column gap (in)"
                value={customInputs.columnGap}
                onChange={v => updateCustomInput('columnGap', v)}
                allowDecimals
                min={0}
                step={0.0625}
              />
              <CustomField
                label="Row gap (in)"
                value={customInputs.rowGap}
                onChange={v => updateCustomInput('rowGap', v)}
                allowDecimals
                min={0}
                step={0.0625}
              />
            </div>
            {customError && <p className="text-xs text-destructive">{customError}</p>}
          </div>
        )}

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
            disabled={selectedIds.size === 0 || isLoading || (isCustom && customError !== null)}
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

interface CustomFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  allowDecimals?: boolean;
}

function CustomField({ label, value, onChange, min, step, allowDecimals }: CustomFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        allowDecimals={allowDecimals}
        size="sm"
        aria-label={label}
      />
    </div>
  );
}
