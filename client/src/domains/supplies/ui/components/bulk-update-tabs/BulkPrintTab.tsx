/**
 * Bulk Print Tab
 *
 * Right-panel configuration for printing barcode labels onto standard label
 * sheets. State + action live in usePrintTabState; the parent owns the footer
 * buttons and the preview modal.
 */

import { useCallback, useMemo, useState } from 'react';

import { SupplyService } from '@domains/supplies/services/SupplyService';
import { Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { NumberInput } from '@shared/ui/primitives/input/NumberInput';
import { notifications } from '@shared/utils/notifications';

import {
  DEFAULT_TEMPLATE_ID,
  SHEET_TEMPLATES,
  getTemplateById,
  type SheetTemplate,
} from '../sheetTemplates';
import { FORMAT_OPTIONS, type BarcodeFormat } from '../SupplyBarcodeLabel';

import type { PrintableLabel } from '../supplyBarcodeSheetTypes';
import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

const FORMAT_CARD_BASE =
  'relative border px-3 py-2 transition-[background-color,border-color,box-shadow,color] duration-200 ' +
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary/40';
const FORMAT_CARD_SELECTED =
  'border-primary/60 bg-[hsl(var(--primary)/0.10)] text-foreground ' +
  'dark:shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.30),0_0_18px_-4px_hsl(var(--primary)/0.50)]';
const FORMAT_CARD_UNSELECTED =
  'border-line-mid text-secondary-foreground dark:shadow-[inset_0_0_12px_-3px_hsl(var(--primary)/0.10)] ' +
  'hover:border-primary/40 hover:text-foreground ' +
  'dark:hover:shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.22),0_0_14px_-6px_hsl(var(--primary)/0.42)]';

const PAPER_ORDER: Record<SheetTemplate['paperSize'], number> = { letter: 0, a4: 1 };

const CUSTOM_TEMPLATE_ID = 'custom';

const PAPER_LABEL: Record<SheetTemplate['paperSize'], string> = { letter: 'Letter', a4: 'A4' };

const TEMPLATE_OPTIONS: SelectOption[] = [
  ...SHEET_TEMPLATES.slice()
    .sort(
      (a, b) =>
        PAPER_ORDER[a.paperSize] - PAPER_ORDER[b.paperSize] ||
        b.labelWidth * b.labelHeight - a.labelWidth * a.labelHeight
    )
    .map(t => ({
      value: t.id,
      label: `${t.labelWidth}" × ${t.labelHeight}" · ${t.columns * t.rows} per sheet`,
      description: `${t.name} · ${PAPER_LABEL[t.paperSize]}`,
    })),
  { value: CUSTOM_TEMPLATE_ID, label: 'Custom', description: 'User-defined dimensions' },
];

const PAPER_SIZE_OPTIONS: SelectOption[] = [
  { value: 'letter', label: 'US Letter (8.5" × 11")' },
  { value: 'a4', label: 'A4 (8.27" × 11.69")' },
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
    return `Layout exceeds paper width (${usedWidth.toFixed(2)}" > ${paper.width}")`;
  }
  if (usedHeight > paper.height + 1e-6) {
    return `Layout exceeds paper height (${usedHeight.toFixed(2)}" > ${paper.height}")`;
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

export interface PrintTabState {
  format: BarcodeFormat;
  setFormat: (f: BarcodeFormat) => void;
  templateId: string;
  handleTemplateChange: (id: string) => void;
  startingPosition: number;
  setStartingPosition: (updater: (prev: number) => number) => void;
  customInputs: CustomTemplateInputs;
  updateCustomInput: <K extends keyof CustomTemplateInputs>(
    field: K,
    value: CustomTemplateInputs[K]
  ) => void;
  isCustom: boolean;
  customError: string | null;
  currentTemplate: SheetTemplate;
  slotsPerSheet: number;
  isLoading: boolean;
  isPreviewOpen: boolean;
  printableLabels: PrintableLabel[] | null;
  canPreview: boolean;
  handlePreviewPrint: () => Promise<void>;
  closePreview: () => void;
  resetAll: () => void;
}

export function usePrintTabState(
  items: SupplyItemWithStock[],
  selectedIds: Set<string>
): PrintTabState {
  const [format, setFormat] = useState<BarcodeFormat>('1d');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [startingPosition, setStartingPositionState] = useState(1);
  const [customInputs, setCustomInputs] = useState<CustomTemplateInputs>(DEFAULT_CUSTOM_INPUTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printableLabels, setPrintableLabels] = useState<PrintableLabel[] | null>(null);

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
    (nextId: string) => {
      setTemplateId(nextId);
      if (nextId === CUSTOM_TEMPLATE_ID) {
        setStartingPositionState(prev => Math.min(prev, customInputs.columns * customInputs.rows));
        return;
      }
      const nextTemplate = getTemplateById(nextId) ?? SHEET_TEMPLATES[0];
      setStartingPositionState(prev => Math.min(prev, nextTemplate.columns * nextTemplate.rows));
    },
    [customInputs.columns, customInputs.rows]
  );

  const updateCustomInput = useCallback(
    <K extends keyof CustomTemplateInputs>(field: K, value: CustomTemplateInputs[K]) => {
      setCustomInputs(prev => {
        const next = { ...prev, [field]: value };
        // Keep startingPosition in bounds if the grid shrinks.
        if (field === 'columns' || field === 'rows') {
          setStartingPositionState(sp => Math.min(sp, next.columns * next.rows));
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
      setIsLoading(false);
      setIsPreviewOpen(true);
    } catch {
      notifications.error('Failed to fetch barcodes');
      setIsLoading(false);
    }
  }, [items, selectedIds]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPrintableLabels(null);
    setIsLoading(false);
  }, []);

  const resetAll = useCallback(() => {
    setFormat('1d');
    setTemplateId(DEFAULT_TEMPLATE_ID);
    setStartingPositionState(() => 1);
    setCustomInputs(DEFAULT_CUSTOM_INPUTS);
    setIsLoading(false);
    setIsPreviewOpen(false);
    setPrintableLabels(null);
  }, []);

  const canPreview = selectedIds.size > 0 && !isLoading && (!isCustom || customError === null);

  return {
    format,
    setFormat,
    templateId,
    handleTemplateChange,
    startingPosition,
    setStartingPosition: setStartingPositionState,
    customInputs,
    updateCustomInput,
    isCustom,
    customError,
    currentTemplate,
    slotsPerSheet,
    isLoading,
    isPreviewOpen,
    printableLabels,
    canPreview,
    handlePreviewPrint,
    closePreview,
    resetAll,
  };
}

interface BulkPrintTabProps {
  selectedCount: number;
  state: PrintTabState;
}

export function BulkPrintTab({ selectedCount, state }: BulkPrintTabProps) {
  const {
    format,
    setFormat,
    templateId,
    handleTemplateChange,
    startingPosition,
    setStartingPosition,
    customInputs,
    updateCustomInput,
    isCustom,
    customError,
    currentTemplate,
    slotsPerSheet,
  } = state;

  return (
    <div className="space-y-4">
      <p className="text-body text-muted-foreground">
        Print barcodes for {selectedCount} selected item{selectedCount === 1 ? '' : 's'} onto a
        standard label sheet.
      </p>

      <div>
        <h4 className={FIELD_LABEL_COMPACT}>Format</h4>
        <div className="grid grid-cols-2 gap-2">
          {FORMAT_OPTIONS.map(({ value, label, Icon }) => {
            const isSelected = format === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                className={`flex items-center justify-center gap-2 ${FORMAT_CARD_BASE} ${
                  isSelected ? FORMAT_CARD_SELECTED : FORMAT_CARD_UNSELECTED
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isSelected
                      ? 'text-primary dark:[filter:drop-shadow(0_0_6px_hsl(var(--primary)/0.6))]'
                      : 'text-muted-foreground'
                  }
                />
                <span className={`text-body-sm font-semibold ${isSelected ? 'phosphor-text' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
        <label id="bulk-print-template-label" className={FIELD_LABEL_COMPACT}>
          Sheet template
        </label>
        <Select
          aria-labelledby="bulk-print-template-label"
          options={TEMPLATE_OPTIONS}
          value={templateId}
          onChange={v => handleTemplateChange(String(v ?? DEFAULT_TEMPLATE_ID))}
          fullWidth
          renderOption={option => (
            <div className="flex flex-col gap-0.5">
              <span className="text-body-sm font-medium text-card-foreground">{option.label}</span>
              {option.description && (
                <span className="text-caption text-muted-foreground">({option.description})</span>
              )}
            </div>
          )}
        />
      </div>

      {isCustom && (
        <div className="space-y-3 p-3 rounded-md border border-border bg-muted/20">
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-print-paper-label" className={FIELD_LABEL_COMPACT}>
              Paper size
            </label>
            <Select
              aria-labelledby="bulk-print-paper-label"
              options={PAPER_SIZE_OPTIONS}
              value={customInputs.paperSize}
              onChange={v =>
                updateCustomInput('paperSize', String(v ?? 'letter') as SheetTemplate['paperSize'])
              }
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CustomField
              label="Label width (inches)"
              value={customInputs.labelWidth}
              onChange={v => updateCustomInput('labelWidth', v)}
              allowDecimals
              min={0.1}
              step={0.125}
            />
            <CustomField
              label="Label height (inches)"
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
              label="Margin top (inches)"
              value={customInputs.marginTop}
              onChange={v => updateCustomInput('marginTop', v)}
              allowDecimals
              min={0}
              step={0.125}
            />
            <CustomField
              label="Margin left (inches)"
              value={customInputs.marginLeft}
              onChange={v => updateCustomInput('marginLeft', v)}
              allowDecimals
              min={0}
              step={0.125}
            />
            <CustomField
              label="Column gap (inches)"
              value={customInputs.columnGap}
              onChange={v => updateCustomInput('columnGap', v)}
              allowDecimals
              min={0}
              step={0.0625}
            />
            <CustomField
              label="Row gap (inches)"
              value={customInputs.rowGap}
              onChange={v => updateCustomInput('rowGap', v)}
              allowDecimals
              min={0}
              step={0.0625}
            />
          </div>
          {customError && <p className="text-body-sm text-destructive">{customError}</p>}
        </div>
      )}

      <div>
        <h4 className={FIELD_LABEL_COMPACT}>Starting position</h4>
        <div className="flex items-center gap-2">
          <NumberInput
            value={startingPosition}
            onChange={v => setStartingPosition(() => v)}
            min={1}
            max={slotsPerSheet}
            aria-label="Starting slot on first sheet"
          />
          <span className="text-caption text-muted-foreground">
            of {slotsPerSheet} slots ({currentTemplate.columns} × {currentTemplate.rows})
          </span>
        </div>
      </div>
    </div>
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
    <div className="flex flex-col items-start">
      <span className={FIELD_LABEL_COMPACT}>{label}</span>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        allowDecimals={allowDecimals}
        size="sm"
        inputWidth="w-20"
        aria-label={label}
      />
    </div>
  );
}
