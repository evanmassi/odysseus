/**
 * Bulk Maintenance Tab
 *
 * Logs a maintenance entry against every selected equipment item.
 */

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentMaintenanceLogRequestSchema } from '@odysseus/shared-schemas';
import { useForm } from 'react-hook-form';

import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { lookupOptions } from '@shared/ui';

import { EquipmentMaintenanceFields } from '../EquipmentMaintenanceFields';

import type { CreateEquipmentMaintenanceLogRequest } from '@odysseus/shared-schemas';
import type { FieldValues } from 'react-hook-form';

export function BulkMaintenanceTab({
  onSubmit,
  onValidityChange,
}: {
  onSubmit: (data: CreateEquipmentMaintenanceLogRequest) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const { data: maintenanceTypes = [] } = useLookupValuesQuery('equipment_maintenance_type');

  const typeOptions = lookupOptions(maintenanceTypes, 'Select type...');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<FieldValues>({
    resolver: zodResolver(createEquipmentMaintenanceLogRequestSchema) as never,
    mode: 'onChange',
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as CreateEquipmentMaintenanceLogRequest);
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <EquipmentMaintenanceFields
        register={register}
        control={control}
        errors={errors}
        typeOptions={typeOptions}
        layout="stacked"
      />
    </form>
  );
}
