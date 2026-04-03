/**
 * Equipment Decommission Form
 *
 * Form for permanently retiring equipment with date, reason, and disposal method.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { decommissionEquipmentItemRequestSchema } from '@odysseus/shared-schemas';
import { Power, X } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useDecommissionEquipmentItemMutation } from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, DatePicker } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForInput } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type { DecommissionEquipmentItemRequest } from '@odysseus/shared-schemas';

interface EquipmentDecommissionFormProps {
  itemId: string;
  itemName: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function EquipmentDecommissionForm({
  itemId,
  itemName,
  onSubmit,
  onCancel,
}: EquipmentDecommissionFormProps) {
  const decommissionMutation = useDecommissionEquipmentItemMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(decommissionEquipmentItemRequestSchema),
    defaultValues: {
      decommissionDate: formatDateForInput(new Date()),
      decommissionReason: '',
      disposalMethod: '',
    },
  });

  const onFormSubmit = async (data: FieldValues) => {
    try {
      await decommissionMutation.mutateAsync({
        id: itemId,
        data: data as DecommissionEquipmentItemRequest,
      });
      notifications.success(`"${itemName}" has been decommissioned`);
      onSubmit();
    } catch {
      notifications.error('Failed to decommission equipment');
    }
  };

  return (
    <ScrollArea className="h-full">
      <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-secondary-foreground">Decommission Equipment</h3>

        <p className="text-xs text-muted-foreground">
          Decommissioning <span className="font-medium text-foreground">{itemName}</span> will mark
          it as permanently retired. It will be hidden from the main list but can still be viewed
          using the &quot;Show Decommissioned&quot; toggle.
        </p>

        <div className="space-y-3">
          <Controller
            name="decommissionDate"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div>
                <span className="block text-sm font-medium text-secondary-foreground mb-1">
                  Decommission Date
                </span>
                <DatePicker
                  value={(value as string) ?? ''}
                  onChange={onChange}
                  state={error ? 'error' : 'default'}
                  fullWidth
                />
                {error && <p className="text-xs text-danger-text mt-1">{error.message}</p>}
              </div>
            )}
          />

          <ValidatedInput
            label="Reason"
            error={!!errors.decommissionReason}
            helperText={errors.decommissionReason?.message}
            registration={register('decommissionReason')}
          />

          <ValidatedInput
            label="Disposal Method"
            error={!!errors.disposalMethod}
            helperText={errors.disposalMethod?.message}
            registration={register('disposalMethod')}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            size="sm"
            variant="danger"
            disabled={isSubmitting}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            Decommission
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Cancel
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}
