import { DEFAULT_GRID_CONFIG, GRID_TEMPLATES } from '@odysseus/shared-schemas';
import { Save } from 'lucide-react';

import { useEditModalForm } from '@shared/hooks';
import { AlertBanner, Button, Select } from '@shared/ui';
import { BoxIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/overlays';

import type { BoxGridScope } from '../StorageManagerContext';
import type { BoxConfiguration, GridConfiguration } from '@odysseus/shared-schemas';

interface BoxGridModalProps {
  isOpen: boolean;
  scope: BoxGridScope;
  scopeLabel: string;
  boxes: { box: BoxConfiguration; filled: number }[];
  onSave: (scope: BoxGridScope, gridConfig: GridConfiguration) => void;
  onClose: () => void;
}

const GRID_OPTIONS = GRID_TEMPLATES.map(template => ({
  value: `${template.rows}x${template.cols}`,
  label: `${template.rows}×${template.cols} Grid (${(template.rows * template.cols).toLocaleString()} positions)`,
}));

function findGridTemplate(rows: number, cols: number): GridConfiguration | undefined {
  return GRID_TEMPLATES.find(template => template.rows === rows && template.cols === cols);
}

function describeGridChange(
  isSingleBox: boolean,
  boxes: BoxGridModalProps['boxes'],
  grid: GridConfiguration
): { variant: 'info' | 'warning'; message: string } | undefined {
  const gridLabel = `${grid.rows}×${grid.cols}`;
  const changing = boxes.filter(
    ({ box }) => box.gridConfig.rows !== grid.rows || box.gridConfig.cols !== grid.cols
  );
  const occupiedCount = changing.filter(({ filled }) => filled > 0).length;
  const emptyCount = changing.length - occupiedCount;

  if (isSingleBox) {
    const filled = boxes[0]?.filled ?? 0;
    if (filled > 0) {
      return {
        variant: 'warning',
        message: `This box holds ${filled} ${filled === 1 ? 'tube' : 'tubes'}. Empty it before changing its grid.`,
      };
    }
    return changing.length === 0
      ? { variant: 'info', message: `This box already uses ${gridLabel}.` }
      : undefined;
  }

  if (changing.length === 0) {
    return { variant: 'info', message: `All ${boxes.length} boxes already use ${gridLabel}.` };
  }
  if (emptyCount === 0) {
    return {
      variant: 'warning',
      message: 'Every box that would change holds tubes, so none can change.',
    };
  }

  const willChange = `${emptyCount} empty ${emptyCount === 1 ? 'box' : 'boxes'} will change to ${gridLabel}.`;
  if (occupiedCount === 0) {
    return { variant: 'info', message: willChange };
  }
  return {
    variant: 'warning',
    message: `${willChange} ${occupiedCount} holding tubes will keep their current grid.`,
  };
}

export function BoxGridModal({
  isOpen,
  scope,
  scopeLabel,
  boxes,
  onSave,
  onClose,
}: BoxGridModalProps) {
  const isSingleBox = scope.boxId !== undefined;
  const firstGrid = boxes[0]?.box.gridConfig;
  const initialGrid =
    (firstGrid && findGridTemplate(firstGrid.rows, firstGrid.cols)) ?? DEFAULT_GRID_CONFIG;

  const {
    formData: selectedGrid,
    setFormData: setSelectedGrid,
    createSubmitHandler,
  } = useEditModalForm(isOpen, initialGrid);

  const isOccupiedSingleBox = isSingleBox && (boxes[0]?.filled ?? 0) > 0;
  const canSave = boxes.some(
    ({ box, filled }) =>
      filled === 0 &&
      (box.gridConfig.rows !== selectedGrid.rows || box.gridConfig.cols !== selectedGrid.cols)
  );
  const preview = describeGridChange(isSingleBox, boxes, selectedGrid);

  const handleGridChange = (value: string | number | (string | number)[] | null) => {
    if (typeof value !== 'string') return;
    const [rows, cols] = value.split('x').map(Number);
    const template = findGridTemplate(rows, cols);
    if (template) setSelectedGrid(template);
  };

  const handleSubmit = createSubmitHandler(() => {
    if (canSave) onSave(scope, selectedGrid);
  });

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="box-grid-form"
        variant="primary"
        size="sm"
        disabled={!canSave}
        leftIcon={<Save size={16} />}
      >
        Save Changes
      </Button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      title={isSingleBox ? 'Change Grid' : 'Change Box Grids'}
      icon={<BoxIcon size={24} />}
      onClose={onClose}
      size="sm"
      footer={footer}
    >
      <form id="box-grid-form" onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={
            isSingleBox ? `Grid Size (${scopeLabel})` : `Grid Size for all boxes in ${scopeLabel}`
          }
          options={GRID_OPTIONS}
          value={`${selectedGrid.rows}x${selectedGrid.cols}`}
          onChange={handleGridChange}
          disabled={isOccupiedSingleBox}
          aria-label="Select box grid size"
          fullWidth
        />
        {preview && (
          <AlertBanner variant={preview.variant} spacing="none" className="text-body-sm">
            {preview.message}
          </AlertBanner>
        )}
      </form>
    </BaseModal>
  );
}
