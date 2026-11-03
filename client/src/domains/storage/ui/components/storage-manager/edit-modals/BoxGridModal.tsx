import { DEFAULT_GRID_CONFIG, GRID_SIZES } from '@odysseus/shared-schemas';
import { Save } from 'lucide-react';

import { useTubesByLocation } from '@domains/tubes';
import { useEditModalForm } from '@shared/hooks';
import { AlertBanner, Button, Select } from '@shared/ui';
import { BoxIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/overlays';
import { positionToCoordinates } from '@shared/utils/gridCoordinates';

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

const GRID_OPTIONS = GRID_SIZES.map(size => ({
  value: `${size.rows}x${size.cols}`,
  label: `${size.rows}×${size.cols} Grid (${(size.rows * size.cols).toLocaleString()} positions)`,
}));

function findGridSize(rows: number, cols: number): GridConfiguration | undefined {
  return GRID_SIZES.find(size => size.rows === rows && size.cols === cols);
}

interface GridChangePreview {
  banner?: { variant: 'info' | 'warning'; message: string };
  canSave: boolean;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function usesGrid(box: BoxConfiguration, grid: GridConfiguration): boolean {
  return box.gridConfig.rows === grid.rows && box.gridConfig.cols === grid.cols;
}

function previewSingleBox(
  box: BoxConfiguration,
  filled: number,
  grid: GridConfiguration,
  tubePositions: number[] | undefined
): GridChangePreview {
  const gridLabel = `${grid.rows}×${grid.cols}`;
  if (usesGrid(box, grid)) {
    return {
      banner: { variant: 'info', message: `This box already uses ${gridLabel}.` },
      canSave: false,
    };
  }
  if (filled === 0) return { canSave: true };
  if (!tubePositions) return { canSave: false };

  const outside = tubePositions.filter(position => {
    const { row, col } = positionToCoordinates(position, box.gridConfig.cols);
    return row >= grid.rows || col >= grid.cols;
  }).length;
  if (outside > 0) {
    return {
      banner: {
        variant: 'warning',
        message: `${countLabel(outside, 'tube sits', 'tubes sit')} in rows or columns a ${gridLabel} grid would remove. Move ${outside === 1 ? 'it' : 'them'} first.`,
      },
      canSave: false,
    };
  }
  return {
    banner: {
      variant: 'info',
      message: `${countLabel(filled, 'tube keeps its', 'tubes keep their')} row and column.`,
    },
    canSave: true,
  };
}

function previewBoxes(
  boxes: BoxGridModalProps['boxes'],
  grid: GridConfiguration
): GridChangePreview {
  const gridLabel = `${grid.rows}×${grid.cols}`;
  const changing = boxes.filter(({ box }) => !usesGrid(box, grid));
  if (changing.length === 0) {
    return {
      banner: { variant: 'info', message: `All ${boxes.length} boxes already use ${gridLabel}.` },
      canSave: false,
    };
  }

  const occupied = changing.filter(({ filled }) => filled > 0);
  const shrinking = occupied.filter(
    ({ box }) => grid.rows < box.gridConfig.rows || grid.cols < box.gridConfig.cols
  );
  const keptTubes = occupied
    .filter(entry => !shrinking.includes(entry))
    .reduce((total, { filled }) => total + filled, 0);

  const parts = [`${countLabel(changing.length, 'box', 'boxes')} will change to ${gridLabel}.`];
  if (keptTubes > 0) {
    parts.push(`${countLabel(keptTubes, 'tube keeps its', 'tubes keep their')} row and column.`);
  }
  if (shrinking.length > 0) {
    parts.push(
      `${countLabel(shrinking.length, 'box has', 'boxes have')} tubes and will be skipped if any sit outside ${gridLabel}.`
    );
  }
  return {
    banner: { variant: shrinking.length > 0 ? 'warning' : 'info', message: parts.join(' ') },
    canSave: true,
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
    (firstGrid && findGridSize(firstGrid.rows, firstGrid.cols)) ?? DEFAULT_GRID_CONFIG;

  const {
    formData: selectedGrid,
    setFormData: setSelectedGrid,
    createSubmitHandler,
  } = useEditModalForm(isOpen, initialGrid);

  const singleBox = isSingleBox ? boxes[0] : undefined;
  const { data: singleBoxTubes } = useTubesByLocation(
    scope.tankId,
    scope.rackId ?? '',
    scope.boxId ?? '',
    { enabled: isOpen && !!singleBox && singleBox.filled > 0 }
  );
  const { banner, canSave } = singleBox
    ? previewSingleBox(
        singleBox.box,
        singleBox.filled,
        selectedGrid,
        singleBoxTubes?.map(tube => tube.location.position)
      )
    : previewBoxes(boxes, selectedGrid);

  const handleGridChange = (value: string | number | (string | number)[] | null) => {
    if (typeof value !== 'string') return;
    const [rows, cols] = value.split('x').map(Number);
    const size = findGridSize(rows, cols);
    if (size) setSelectedGrid(size);
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
          aria-label="Select box grid size"
          fullWidth
        />
        {banner && (
          <AlertBanner variant={banner.variant} spacing="none" className="text-body-sm">
            {banner.message}
          </AlertBanner>
        )}
      </form>
    </BaseModal>
  );
}
