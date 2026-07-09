/**
 * Bulk Relocate Tab
 *
 * Reassigns every selected item to a different category.
 */

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { equipmentBulkRelocateRequestSchema } from '@odysseus/shared-schemas';
import { useForm, Controller } from 'react-hook-form';

import { CategoryHierarchySelect } from '@shared/ui/components/inventory';

import type { EquipmentCategory, EquipmentBulkRelocateRequest } from '@odysseus/shared-schemas';
import type { FieldValues } from 'react-hook-form';

const bulkRelocateFormSchema = equipmentBulkRelocateRequestSchema.shape.data;

export function BulkRelocateTab({
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
          <CategoryHierarchySelect
            categories={categories}
            value={(value as string) ?? ''}
            onChange={onChange}
            error={error?.message}
            labelId="bulk-relocate-label"
          />
        )}
      />
    </form>
  );
}
