import { zodResolver } from '@hookform/resolvers/zod';
import { decommissionEquipmentItemRequestSchema } from '@odysseus/shared-schemas';
import { Power } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useDecommissionEquipmentItemMutation } from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, DatePicker, Divider } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { normalizeDateString } from '@shared/utils/dateFormatters';
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(decommissionEquipmentItemRequestSchema),
    defaultValues: {
      decommissionDate: normalizeDateString(new Date()),
      decommissionReason: '',
      disposalMethod: '',
    },
  });

  const onFormSubmit = (data: FieldValues) => {
    decommissionMutation.mutate(
      { id: itemId, data: data as DecommissionEquipmentItemRequest },
      {
        onSuccess: () => {
          notifications.success(`"${itemName}" has been decommissioned`);
          onSubmit();
        },
      }
    );
  };

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-warning-text">
          <Power size={20} />
        </span>
        <h2 className="text-lg font-medium text-foreground">Decommission Equipment</h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <form
          id="decommission-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-4 p-4"
        >
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            Decommissioning <span className="font-medium text-foreground">{itemName}</span> will
            mark it as permanently retired. It will be hidden from the main list but can still be
            viewed using the &quot;Show Decommissioned&quot; toggle.
          </p>

          <div className="space-y-3">
            <Controller
              name="decommissionDate"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className={FIELD_LABEL_COMPACT}>Decommission Date</span>
                  <DatePicker
                    value={(value as string) ?? ''}
                    onChange={onChange}
                    state={error ? 'error' : 'default'}
                    fullWidth
                  />
                  {error && <p className="mt-1 text-caption text-danger-text">{error.message}</p>}
                </div>
              )}
            />

            <ValidatedInput
              label="Reason"
              labelStyle="compact"
              error={!!errors.decommissionReason}
              helperText={errors.decommissionReason?.message}
              registration={register('decommissionReason')}
            />

            <ValidatedInput
              label="Disposal Method"
              labelStyle="compact"
              error={!!errors.disposalMethod}
              helperText={errors.disposalMethod?.message}
              registration={register('disposalMethod')}
            />
          </div>
        </form>
      </ScrollArea>

      <div className="relative flex-shrink-0 border-t border-line-faint bg-card px-4 py-3 dark:bg-shade/15">
        <Divider tone="warning" className="absolute inset-x-0 -top-px" />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="decommission-form"
            variant="warning"
            size="sm"
            disabled={decommissionMutation.isPending}
            leftIcon={<Power className="h-3.5 w-3.5" />}
          >
            Decommission
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
