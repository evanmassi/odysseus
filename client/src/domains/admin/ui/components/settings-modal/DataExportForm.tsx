/**
 * Data Export Form
 *
 * Export controls for tubes, users, researchers, and system backup.
 */

import { useState, useCallback } from 'react';

import { Download, FileSpreadsheet, FileJson } from 'lucide-react';

import { logger } from '@infra/logger';
import { Button, Chip, Select } from '@shared/ui';
import { notifications } from '@shared/utils';
import { downloadBlob } from '@shared/utils/downloadBlob';

import { exportService } from '../../../services/ExportService';

type ExportType = 'tubes' | 'users' | 'researchers' | 'equipment' | 'system-backup';
type ExportFormat = 'csv' | 'json';

interface ExportOption {
  value: ExportType;
  label: string;
  description: string;
  defaultFormat: ExportFormat;
  jsonOnly?: boolean;
}

const exportOptions: ExportOption[] = [
  {
    value: 'tubes',
    label: 'Tube Inventory',
    description: 'All tubes with researcher names',
    defaultFormat: 'csv',
  },
  {
    value: 'users',
    label: 'Users',
    description: 'User accounts (excludes passwords)',
    defaultFormat: 'csv',
  },
  {
    value: 'researchers',
    label: 'Researchers',
    description: 'All researchers with tube counts',
    defaultFormat: 'csv',
  },
  {
    value: 'equipment',
    label: 'Equipment Inventory',
    description: 'All equipment items with categories',
    defaultFormat: 'csv',
  },
  {
    value: 'system-backup',
    label: 'System Backup',
    description: 'Configuration and settings',
    defaultFormat: 'json',
    jsonOnly: true,
  },
];

function generateFilename(type: ExportType, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  return `odysseus-${type}-${date}.${format}`;
}

export function DataExportForm() {
  const [selectedType, setSelectedType] = useState<ExportType>('tubes');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const currentOption = exportOptions.find(opt => opt.value === selectedType);
  const isJsonOnly = currentOption?.jsonOnly ?? false;

  // Reset format when switching to a JSON-only export type
  const handleTypeChange = useCallback((value: string) => {
    const newType = value as ExportType;
    setSelectedType(newType);

    const option = exportOptions.find(opt => opt.value === newType);
    if (option?.jsonOnly) {
      setSelectedFormat('json');
    }
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      let blob: Blob;
      const format = isJsonOnly ? 'json' : selectedFormat;

      switch (selectedType) {
        case 'tubes':
          blob = await exportService.exportTubes(format);
          break;
        case 'users':
          blob = await exportService.exportUsers(format);
          break;
        case 'researchers':
          blob = await exportService.exportResearchers(format);
          break;
        case 'equipment':
          blob = await exportService.exportEquipment(format);
          break;
        case 'system-backup':
          blob = await exportService.exportSystemBackup();
          break;
      }

      const filename = generateFilename(selectedType, format);
      downloadBlob(blob, filename);

      notifications.success(`Exported ${currentOption?.label ?? selectedType} successfully`);
    } catch (error) {
      logger.error('Export failed', { error, type: selectedType, format: selectedFormat });
      notifications.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedType, selectedFormat, isJsonOnly, currentOption?.label]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Download size={18} className="text-muted-foreground flex-shrink-0" />

        <div className="w-52">
          <Select
            value={selectedType}
            onChange={value => handleTypeChange(String(value))}
            options={exportOptions.map(opt => ({
              value: opt.value,
              label: opt.label,
            }))}
            aria-label="Select data to export"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Chip
            behavior="selectable"
            selected={selectedFormat === 'csv' && !isJsonOnly}
            onSelect={() => setSelectedFormat('csv')}
            disabled={isJsonOnly}
            size="sm"
            leftIcon={<FileSpreadsheet size={12} />}
            aria-label="Export as CSV"
          >
            CSV
          </Chip>
          <Chip
            behavior="selectable"
            selected={selectedFormat === 'json' || isJsonOnly}
            onSelect={() => setSelectedFormat('json')}
            size="sm"
            leftIcon={<FileJson size={12} />}
            aria-label="Export as JSON"
          >
            JSON
          </Chip>
        </div>

        <div className="flex-1" />

        <Button
          variant="primary"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
          isLoading={isExporting}
          loadingText="Exporting..."
          leftIcon={<Download size={14} />}
        >
          Export
        </Button>
      </div>

      <p className="text-xs text-muted-foreground pl-[30px]">{currentOption?.description}</p>
    </div>
  );
}
