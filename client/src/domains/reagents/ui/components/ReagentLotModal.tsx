/**
 * Reagent Lot Modal
 *
 * Corrects a lot's opened and expiration dates. Quantity and status are not editable
 * here — stock leaves a lot through a transaction so the ledger records it.
 */

import { useState } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';
import { CalendarClock, Save } from 'lucide-react';

import { useUpdateReagentLotMutation } from '@domains/reagents/hooks';
import { Button, DatePicker } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type { ReagentLot } from '@odysseus/shared-schemas';

interface ReagentLotModalProps {
  itemId: string;
  lot: ReagentLot;
  stockUnit?: string;
  onClose: () => void;
}

export function ReagentLotModal({ itemId, lot, stockUnit, onClose }: ReagentLotModalProps) {
  const updateLotMutation = useUpdateReagentLotMutation();
  const [openedDate, setOpenedDate] = useState(normalizeDateString(lot.openedDate));
  const [expirationDate, setExpirationDate] = useState(normalizeDateString(lot.expirationDate));

  const handleSave = () => {
    updateLotMutation.mutate(
      { itemId, lotId: lot.id, data: { openedDate, expirationDate } },
      {
        onSuccess: () => {
          notifications.success('Lot updated');
          onClose();
        },
      }
    );
  };

  return (
    <BaseModal
      isOpen
      title="Edit Lot"
      icon={<CalendarClock size={24} />}
      onClose={onClose}
      size="sm"
      locator={
        <span className="font-mono text-data-sm tracking-[0.04em] text-muted-foreground">
          {lot.lotNumber ?? 'No lot #'}
          <span className="mx-1.5 text-foreground/30">{'//'}</span>
          {stockUnit ? formatQuantity(lot.quantity, stockUnit) : lot.quantity}
        </span>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={updateLotMutation.isPending}
            loadingText="Saving..."
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <span className={FIELD_LABEL_COMPACT}>Opened Date</span>
          <DatePicker value={openedDate} onChange={setOpenedDate} clearable fullWidth />
        </div>
        <div>
          <span className={FIELD_LABEL_COMPACT}>Expiration Date</span>
          <DatePicker value={expirationDate} onChange={setExpirationDate} clearable fullWidth />
        </div>
      </div>
    </BaseModal>
  );
}
