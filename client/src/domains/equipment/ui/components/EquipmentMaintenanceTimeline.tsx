/**
 * Equipment Maintenance Timeline
 *
 * Chronological list of maintenance log entries with collapsible details
 * and admin edit/delete actions.
 */

import { useState } from 'react';

import { ChevronRight, Plus, SquarePen, Trash2 } from 'lucide-react';

import { useDeleteEquipmentMaintenanceEntryMutation } from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';

import type { EquipmentMaintenanceLog } from '@odysseus/shared-schemas';

interface EquipmentMaintenanceTimelineProps {
  maintenanceLog: EquipmentMaintenanceLog[];
  itemId: string;
  isAdmin: boolean;
  onEditEntry: (entry: EquipmentMaintenanceLog) => void;
  onAddEntry: () => void;
  className?: string;
}

function MaintenanceDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-body-sm text-card-foreground/85">
        {value}
      </span>
    </div>
  );
}

export function EquipmentMaintenanceTimeline({
  maintenanceLog,
  itemId,
  isAdmin,
  onEditEntry,
  onAddEntry,
  className,
}: EquipmentMaintenanceTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteEquipmentMaintenanceEntryMutation();

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteMutation.mutateAsync({ itemId, entryId: pendingDeleteId });
      notifications.success('Maintenance entry removed');
    } catch {
      notifications.error('Failed to remove maintenance entry');
    }
    setPendingDeleteId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className={`space-y-0.5 ${className ?? ''}`}>
      {maintenanceLog.length === 0 ? (
        <p className="text-body-sm italic text-card-foreground/30">No maintenance entries</p>
      ) : (
        maintenanceLog.map(entry => {
          const isExpanded = expandedId === entry.id;
          /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: empty strings are falsy intentionally, treating "" same as undefined/null */
          const hasDetails = !!(
            entry.performedBy ||
            entry.technician ||
            entry.cost !== undefined ||
            entry.description ||
            entry.notes ||
            entry.nextScheduledDate
          );
          /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

          return (
            <div key={entry.id}>
              <div
                className="group flex cursor-pointer items-center gap-2 py-1 text-body-sm"
                onClick={() => hasDetails && toggleExpand(entry.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && hasDetails) toggleExpand(entry.id);
                }}
                role={hasDetails ? 'button' : undefined}
                tabIndex={hasDetails ? 0 : undefined}
              >
                <ChevronRight
                  size={12}
                  className={`flex-shrink-0 text-card-foreground/40 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasDetails ? 'invisible' : ''}`}
                />
                <span className="whitespace-nowrap font-mono text-data-sm tracking-[0.04em] text-card-foreground/70">
                  {formatDateForDisplay(entry.datePerformed)}
                </span>
                <span className="text-card-foreground/25">·</span>
                <Tooltip content={entry.maintenanceType} side="top">
                  <span className="truncate font-medium text-card-foreground">
                    {entry.maintenanceType}
                  </span>
                </Tooltip>
                {isAdmin && (
                  <div
                    className="ml-auto flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    role="toolbar"
                  >
                    <Tooltip content="Edit entry" side="left">
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        onClick={() => onEditEntry(entry)}
                        aria-label="Edit entry"
                      >
                        <SquarePen className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Remove entry" side="left">
                      <Button
                        variant="ghost-danger"
                        size="xs"
                        iconOnly
                        onClick={() => setPendingDeleteId(entry.id)}
                        aria-label="Remove entry"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {isExpanded && hasDetails && (
                <div className="mb-1.5 ml-[18px] space-y-1 border-l border-line-soft pl-3">
                  {entry.performedBy && (
                    <MaintenanceDetail label="Performed By" value={entry.performedBy} />
                  )}
                  {entry.technician && (
                    <MaintenanceDetail label="Technician" value={entry.technician} />
                  )}
                  {entry.cost !== undefined && (
                    <MaintenanceDetail label="Cost" value={formatCurrency(entry.cost) ?? '—'} />
                  )}
                  {entry.nextScheduledDate && (
                    <MaintenanceDetail
                      label="Next Scheduled"
                      value={formatDateForDisplay(entry.nextScheduledDate)}
                    />
                  )}
                  {entry.description && (
                    <MaintenanceDetail label="Description" value={entry.description} />
                  )}
                  {entry.notes && <MaintenanceDetail label="Notes" value={entry.notes} />}
                </div>
              )}
            </div>
          );
        })
      )}

      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddEntry}
          className="mt-1"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add Entry
        </Button>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title="Remove Entry"
          message="Are you sure you want to remove this maintenance entry? This action cannot be undone."
          confirmText="Remove"
          onConfirm={() => void handleDelete()}
          onCancel={() => setPendingDeleteId(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
