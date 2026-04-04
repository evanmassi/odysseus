/**
 * Equipment Maintenance Timeline
 *
 * Chronological list of maintenance log entries with collapsible details
 * and admin edit/delete actions.
 */

import { useState } from 'react';

import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';

import { useDeleteEquipmentMaintenanceEntryMutation } from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, InfoField, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';
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

function formatCost(cost: number | undefined): string | undefined {
  if (cost === undefined) return undefined;
  return `$${cost.toFixed(2)}`;
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
    <div className={`space-y-1 ${className ?? ''}`}>
      {maintenanceLog.length === 0 ? (
        <p className="text-xs text-card-foreground/30 italic">No maintenance entries</p>
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
            <div key={entry.id} className="rounded-md border border-border/50 overflow-hidden">
              <div
                className="group flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => hasDetails && toggleExpand(entry.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && hasDetails) toggleExpand(entry.id);
                }}
                role={hasDetails ? 'button' : undefined}
                tabIndex={hasDetails ? 0 : undefined}
              >
                <ChevronRight
                  size={14}
                  className={`text-card-foreground/40 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''} ${!hasDetails ? 'invisible' : ''}`}
                />
                <span className="text-card-foreground/60 whitespace-nowrap">
                  {formatDateForDisplay(entry.datePerformed)}
                </span>
                <span className="text-card-foreground/30">·</span>
                <span className="text-card-foreground font-medium truncate">
                  {entry.maintenanceType}
                </span>
                {isAdmin && (
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex gap-0.5 flex-shrink-0"
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
                        <Pencil className="w-3 h-3" />
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
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {isExpanded && hasDetails && (
                <div className="px-3 pb-2 pt-1 border-t border-border/30 bg-muted/20">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {entry.performedBy && (
                      <InfoField label="Performed By" value={entry.performedBy} inline={false} />
                    )}
                    {entry.technician && (
                      <InfoField label="Technician" value={entry.technician} inline={false} />
                    )}
                    {entry.cost !== undefined && (
                      <InfoField label="Cost" value={formatCost(entry.cost)} inline={false} />
                    )}
                    {entry.nextScheduledDate && (
                      <InfoField
                        label="Next Scheduled"
                        value={formatDateForDisplay(entry.nextScheduledDate)}
                        inline={false}
                      />
                    )}
                  </div>
                  {entry.description && (
                    <div className="mt-2">
                      <InfoField label="Description" value={entry.description} inline={false} />
                    </div>
                  )}
                  {entry.notes && (
                    <div className="mt-2">
                      <InfoField label="Notes" value={entry.notes} inline={false} />
                    </div>
                  )}
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
          leftIcon={<Plus className="w-3.5 h-3.5" />}
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
