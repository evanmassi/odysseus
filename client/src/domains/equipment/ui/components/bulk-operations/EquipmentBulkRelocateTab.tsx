/**
 * Bulk Relocate Tab
 *
 * Reassigns every selected item to a different category.
 */

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { equipmentBulkRelocateRequestSchema } from '@odysseus/shared-schemas';
import { useForm, Controller } from 'react-hook-form';

import { buildHierarchyOptions, Select, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';

import type { EquipmentCategory, EquipmentBulkRelocateRequest } from '@odysseus/shared-schemas';
import type { FieldValues } from 'react-hook-form';

const bulkRelocateFormSchema = equipmentBulkRelocateRequestSchema.shape.data;

export function EquipmentBulkRelocateTab({
  categories,
  onSubmit,
  onValidityChange,
}: {
  categories: EquipmentCategory[];
  onSubmit: (data: EquipmentBulkRelocateRequest['data']) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const {
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(bulkRelocateFormSchema) as never,
    mode: 'onChange',
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as EquipmentBulkRelocateRequest['data']);
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="categoryId"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Select
            label="Category"
            labelClassName={FIELD_LABEL_COMPACT}
            options={withPlaceholder('Select category...', buildHierarchyOptions(categories))}
            value={(value as string) ?? ''}
            onChange={v => onChange(String(v ?? ''))}
            state={error ? 'error' : 'default'}
            error={error?.message}
            fullWidth
          />
        )}
      />
    </form>
  );
}
