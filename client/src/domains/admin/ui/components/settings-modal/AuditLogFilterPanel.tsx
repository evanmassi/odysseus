import { useState, useCallback, useMemo, type ReactNode } from 'react';

import { ChevronDown, ChevronRight, UserRound, Zap, Box, Calendar } from 'lucide-react';

import { Chip, DatePicker, Input, Tooltip } from '@shared/ui';
import {
  headerSurface,
  HEADER_TOP_EDGE,
} from '@shared/ui/primitives/console-panel/consoleHeaderSurface';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { MS_PER_DAY } from '@shared/utils';

export interface AuditFilterState {
  actions?: string[];
  entityTypes?: string[];
  username?: string;
  dateFrom?: string;
  dateTo?: string;
  datePreset?: string;
}

interface ActionSection {
  key: string;
  label: string;
  prefixes: string[];
  actions: Array<{ value: string; label: string }>;
}

const ACTION_SECTIONS: ActionSection[] = [
  {
    key: 'tube',
    label: 'Tube',
    prefixes: ['tube_'],
    actions: [
      { value: 'tube_created', label: 'Created' },
      { value: 'tube_updated', label: 'Updated' },
      { value: 'tube_moved', label: 'Moved' },
      { value: 'tube_deleted', label: 'Deleted' },
      { value: 'tube_bulk_created', label: 'Bulk Created' },
      { value: 'tube_bulk_updated', label: 'Bulk Updated' },
      { value: 'tube_bulk_deleted', label: 'Bulk Removed' },
      { value: 'tube_bulk_moved', label: 'Bulk Moved' },
    ],
  },
  {
    key: 'storage',
    label: 'Storage',
    prefixes: ['tank_', 'rack_', 'box_', 'lab_'],
    actions: [
      { value: 'tank_created', label: 'Tank Created' },
      { value: 'tank_updated', label: 'Tank Updated' },
      { value: 'tank_deleted', label: 'Tank Deleted' },
      { value: 'rack_created', label: 'Rack Created' },
      { value: 'rack_updated', label: 'Rack Updated' },
      { value: 'rack_deleted', label: 'Rack Deleted' },
      { value: 'box_created', label: 'Box Created' },
      { value: 'box_updated', label: 'Box Updated' },
      { value: 'box_deleted', label: 'Box Deleted' },
      { value: 'lab_renamed', label: 'Lab Name Changed' },
    ],
  },
  {
    key: 'equipment',
    label: 'Equipment',
    prefixes: ['equipment_'],
    actions: [
      { value: 'equipment_item_created', label: 'Created' },
      { value: 'equipment_item_updated', label: 'Updated' },
      { value: 'equipment_item_decommissioned', label: 'Decommissioned' },
      { value: 'equipment_item_deleted', label: 'Removed' },
      { value: 'equipment_maintenance_logged', label: 'Maintenance Logged' },
      { value: 'equipment_maintenance_updated', label: 'Maintenance Updated' },
      { value: 'equipment_maintenance_deleted', label: 'Maintenance Removed' },
      { value: 'equipment_category_created', label: 'Category Created' },
      { value: 'equipment_category_updated', label: 'Category Updated' },
      { value: 'equipment_category_deleted', label: 'Category Removed' },
      { value: 'equipment_document_added', label: 'Document Added' },
      { value: 'equipment_document_removed', label: 'Document Removed' },
      { value: 'equipment_bulk_maintenance_logged', label: 'Bulk Maintenance' },
      { value: 'equipment_bulk_status_changed', label: 'Bulk Status Change' },
      { value: 'equipment_bulk_relocated', label: 'Bulk Relocate' },
    ],
  },
  {
    key: 'supply',
    label: 'Supply',
    prefixes: ['supply_'],
    actions: [
      { value: 'supply_item_created', label: 'Item Created' },
      { value: 'supply_item_updated', label: 'Item Updated' },
      { value: 'supply_item_archived', label: 'Item Archived' },
      { value: 'supply_item_deleted', label: 'Item Removed' },
      { value: 'supply_stock_received', label: 'Stock Received' },
      { value: 'supply_stock_issued', label: 'Stock Issued' },
      { value: 'supply_stock_count_adjusted', label: 'Count Adjusted' },
      { value: 'supply_stock_disposed', label: 'Stock Disposed' },
      { value: 'supply_stock_voided', label: 'Stock Voided' },
      { value: 'supply_category_created', label: 'Category Created' },
      { value: 'supply_category_updated', label: 'Category Updated' },
      { value: 'supply_category_deleted', label: 'Category Removed' },
      { value: 'supply_document_added', label: 'Document Added' },
      { value: 'supply_document_removed', label: 'Document Removed' },
      { value: 'supply_bulk_received', label: 'Bulk Received' },
      { value: 'supply_bulk_issued', label: 'Bulk Issued' },
      { value: 'supply_bulk_category_reassigned', label: 'Bulk Reassigned' },
      { value: 'supply_bulk_archived', label: 'Bulk Archived' },
      { value: 'supply_bulk_voided', label: 'Bulk Voided' },
    ],
  },
  {
    key: 'donor',
    label: 'Donor',
    prefixes: ['donor_'],
    actions: [
      { value: 'donor_created', label: 'Created' },
      { value: 'donor_updated', label: 'Updated' },
      { value: 'donor_deleted', label: 'Deleted' },
    ],
  },
  {
    key: 'researcher',
    label: 'Researcher',
    prefixes: ['researcher_'],
    actions: [
      { value: 'researcher_created', label: 'Created' },
      { value: 'researcher_updated', label: 'Updated' },
      { value: 'researcher_deactivated', label: 'Deactivated' },
      { value: 'researcher_reactivated', label: 'Reactivated' },
    ],
  },
  {
    key: 'user',
    label: 'User',
    prefixes: ['user_'],
    actions: [
      { value: 'user_created', label: 'Created' },
      { value: 'user_logged_in', label: 'Login' },
      { value: 'user_logged_out', label: 'Logout' },
      { value: 'user_role_changed', label: 'Role Changed' },
      { value: 'user_password_changed', label: 'Password Changed' },
      { value: 'user_linked_to_researcher', label: 'Linked' },
      { value: 'user_unlinked_from_researcher', label: 'Unlinked' },
      { value: 'user_deleted', label: 'Deleted' },
    ],
  },
];

const ALL_ACTIONS = ACTION_SECTIONS.flatMap(s => s.actions);

const ENTITY_TYPES = [
  { value: 'tube', label: 'Tube' },
  { value: 'tank', label: 'Tank' },
  { value: 'rack', label: 'Rack' },
  { value: 'box', label: 'Box' },
  { value: 'lab', label: 'Lab' },
  { value: 'equipment_item', label: 'Equipment' },
  { value: 'supply_item', label: 'Supply' },
  { value: 'donor', label: 'Donor' },
  { value: 'user', label: 'User' },
  { value: 'researcher', label: 'Researcher' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'lastyear', label: 'Last Year' },
  { value: 'alltime', label: 'All Time' },
];

interface AuditLogFilterPanelProps {
  filters: AuditFilterState;
  onChange: (filters: AuditFilterState) => void;
  onClear: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  count,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-b border-line-soft last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-foreground/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-foreground/40" />
          )}
          <span className="flex items-center text-foreground/55">{icon}</span>
          <span className="type-label text-label-xs tracking-label-wide text-foreground/80">
            {title}
          </span>
        </div>
        {count > 0 && (
          <span className="font-mono text-data-sm tabular-nums text-primary/90">{count}</span>
        )}
      </button>
      {isOpen && <div className="px-4 pb-3 pt-0.5">{children}</div>}
    </div>
  );
}

interface ActionSubsectionProps {
  section: ActionSection;
  isOpen: boolean;
  onToggle: () => void;
  selectedActions: string[];
  onToggleAction: (action: string) => void;
}

function ActionSubsection({
  section,
  isOpen,
  onToggle,
  selectedActions,
  onToggleAction,
}: ActionSubsectionProps) {
  const count = selectedActions.filter(a => section.prefixes.some(p => a.startsWith(p))).length;

  return (
    <div>
      <button
        onClick={onToggle}
        className="mb-2 flex items-center gap-1.5 text-foreground/55 transition-colors hover:text-primary"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="type-label text-label-2xs tracking-label-wide text-foreground/55">
          {section.label}
        </span>
        {count > 0 && (
          <span className="font-mono text-data-sm tabular-nums text-primary/90">{count}</span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-wrap gap-1 ml-4">
          {section.actions.map(action => (
            <Chip
              key={action.value}
              behavior="selectable"
              size="sm"
              selected={selectedActions.includes(action.value)}
              onSelect={() => onToggleAction(action.value)}
            >
              {action.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditLogFilterPanel({ filters, onChange, onClear }: AuditLogFilterPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleAction = useCallback(
    (action: string) => {
      const actions = filters.actions ?? [];
      const newActions = actions.includes(action)
        ? actions.filter(a => a !== action)
        : [...actions, action];
      onChange({ ...filters, actions: newActions.length > 0 ? newActions : undefined });
    },
    [filters, onChange]
  );

  const toggleEntityType = useCallback(
    (entityType: string) => {
      const entityTypes = filters.entityTypes ?? [];
      const newEntityTypes = entityTypes.includes(entityType)
        ? entityTypes.filter(e => e !== entityType)
        : [...entityTypes, entityType];
      onChange({ ...filters, entityTypes: newEntityTypes.length > 0 ? newEntityTypes : undefined });
    },
    [filters, onChange]
  );

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let dateFrom: Date | undefined;

    switch (preset) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last7days':
        dateFrom = new Date(now.getTime() - 7 * MS_PER_DAY);
        break;
      case 'last30days':
        dateFrom = new Date(now.getTime() - 30 * MS_PER_DAY);
        break;
      case 'last6months':
        dateFrom = new Date(now.getTime() - 180 * MS_PER_DAY);
        break;
      case 'lastyear':
        dateFrom = new Date(now.getTime() - 365 * MS_PER_DAY);
        break;
      case 'alltime':
        onChange({ ...filters, dateFrom: undefined, dateTo: undefined, datePreset: preset });
        return;
    }

    onChange({
      ...filters,
      dateFrom: dateFrom?.toISOString().slice(0, 16),
      dateTo: undefined,
      datePreset: preset,
    });
  };

  const getSectionCount = (section: string): number => {
    switch (section) {
      case 'actions':
        return filters.actions?.length ?? 0;
      case 'entityTypes':
        return filters.entityTypes?.length ?? 0;
      case 'user':
        return filters.username ? 1 : 0;
      case 'date':
        return (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);
      default:
        return 0;
    }
  };

  const activeFilters = useMemo(() => {
    const result: Array<{ label: string; onRemove: () => void }> = [];

    filters.actions?.forEach(action => {
      const actionDef = ALL_ACTIONS.find(a => a.value === action);
      if (actionDef) {
        result.push({ label: actionDef.label, onRemove: () => toggleAction(action) });
      }
    });

    filters.entityTypes?.forEach(entityType => {
      const entity = ENTITY_TYPES.find(e => e.value === entityType);
      if (entity) {
        result.push({ label: entity.label, onRemove: () => toggleEntityType(entityType) });
      }
    });

    if (filters.username) {
      result.push({
        label: `User: ${filters.username}`,
        onRemove: () => onChange({ ...filters, username: undefined }),
      });
    }

    if (filters.dateFrom) {
      result.push({
        label: `From: ${filters.dateFrom.slice(0, 10)}`,
        onRemove: () => onChange({ ...filters, dateFrom: undefined }),
      });
    }

    if (filters.dateTo) {
      result.push({
        label: `To: ${filters.dateTo.slice(0, 10)}`,
        onRemove: () => onChange({ ...filters, dateTo: undefined }),
      });
    }

    return result;
  }, [filters, toggleAction, toggleEntityType, onChange]);

  const hasActiveFilters = activeFilters.length > 0;
  const [showAllFilters, setShowAllFilters] = useState(false);
  const TRUNCATE_LIMIT = 6;
  const visibleFilters = showAllFilters ? activeFilters : activeFilters.slice(0, TRUNCATE_LIMIT);
  const hiddenCount = activeFilters.length - TRUNCATE_LIMIT;
  const selectedActions = filters.actions ?? [];

  return (
    <div className="border border-line-soft bg-card">
      <div
        className="relative flex items-center justify-between border-b border-line-soft px-4 py-2.5"
        style={{ background: headerSurface(true), boxShadow: HEADER_TOP_EDGE }}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-3 w-0.5 shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
          />
          <span className="type-label text-label-xs tracking-label-wide text-foreground/70">
            Filters
          </span>
        </div>
        <Tooltip content="Clear all filters" side="bottom">
          <button
            onClick={onClear}
            className="px-2 py-1 type-label text-label-2xs text-foreground/55 transition-colors hover:text-primary"
          >
            Clear All
          </button>
        </Tooltip>
      </div>

      <ScrollArea className="max-h-96 p-1" tabIndex={-1}>
        <div className="grid grid-cols-2">
          <div className="border-r border-line-soft">
            <CollapsibleSection
              title="User"
              icon={<UserRound className="h-3.5 w-3.5" />}
              count={getSectionCount('user')}
              isOpen={openSections['user'] ?? false}
              onToggle={() => toggleSection('user')}
            >
              <Input
                type="text"
                placeholder="Filter by username"
                value={filters.username ?? ''}
                onValueChange={value => onChange({ ...filters, username: value || undefined })}
                size="sm"
                fullWidth
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Action"
              icon={<Zap className="h-3.5 w-3.5" />}
              count={getSectionCount('actions')}
              isOpen={openSections['actions'] ?? false}
              onToggle={() => toggleSection('actions')}
            >
              <div className="space-y-3">
                {ACTION_SECTIONS.map(section => (
                  <ActionSubsection
                    key={section.key}
                    section={section}
                    isOpen={openSections[`${section.key}Actions`] ?? false}
                    onToggle={() => toggleSection(`${section.key}Actions`)}
                    selectedActions={selectedActions}
                    onToggleAction={toggleAction}
                  />
                ))}
              </div>
            </CollapsibleSection>
          </div>

          <div>
            <CollapsibleSection
              title="Item"
              icon={<Box className="h-3.5 w-3.5" />}
              count={getSectionCount('entityTypes')}
              isOpen={openSections['entityTypes'] ?? false}
              onToggle={() => toggleSection('entityTypes')}
            >
              <div className="flex flex-wrap gap-2">
                {ENTITY_TYPES.map(entity => (
                  <Chip
                    key={entity.value}
                    behavior="selectable"
                    size="sm"
                    selected={filters.entityTypes?.includes(entity.value) ?? false}
                    onSelect={() => toggleEntityType(entity.value)}
                  >
                    {entity.label}
                  </Chip>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Date Range"
              icon={<Calendar className="h-3.5 w-3.5" />}
              count={getSectionCount('date')}
              isOpen={openSections['date'] ?? false}
              onToggle={() => toggleSection('date')}
            >
              <div className="space-y-3">
                <div>
                  <div className="mb-2 type-label text-label-2xs tracking-label-wide text-foreground/55">
                    Quick Ranges
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Quick date range presets"
                  >
                    {DATE_PRESETS.map(preset => (
                      <Chip
                        key={preset.value}
                        behavior="selectable"
                        size="sm"
                        selected={filters.datePreset === preset.value}
                        onSelect={() => applyDatePreset(preset.value)}
                      >
                        {preset.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <fieldset className="border-0 p-0 m-0">
                  <legend className="mb-1 type-label text-label-2xs tracking-label-wide text-foreground/55">
                    Custom Range
                  </legend>
                  <div className="space-y-2">
                    <DatePicker
                      value={filters.dateFrom?.slice(0, 10) ?? ''}
                      onChange={v =>
                        onChange({
                          ...filters,
                          dateFrom: v || undefined,
                          datePreset: undefined,
                        })
                      }
                      placeholder="From"
                      aria-label="Filter start date"
                      size="xs"
                      fullWidth
                      clearable
                    />
                    <DatePicker
                      value={filters.dateTo?.slice(0, 10) ?? ''}
                      onChange={v =>
                        onChange({ ...filters, dateTo: v || undefined, datePreset: undefined })
                      }
                      placeholder="To"
                      aria-label="Filter end date"
                      size="xs"
                      fullWidth
                      clearable
                    />
                  </div>
                </fieldset>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </ScrollArea>

      {hasActiveFilters && (
        <div className="border-t border-line-soft bg-foreground/[0.02] px-3 py-2">
          <div className="flex flex-wrap gap-1 items-center">
            {visibleFilters.map((filter, idx) => (
              <Tooltip
                content={`Remove ${filter.label}`}
                side="bottom"
                key={`${filter.label}-${idx}`}
              >
                <Chip behavior="removable" size="sm" color="active" onRemove={filter.onRemove}>
                  {filter.label}
                </Chip>
              </Tooltip>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllFilters(!showAllFilters)}
                className="px-2 py-0.5 type-label text-label-2xs text-foreground/60 transition-colors hover:text-primary"
              >
                {showAllFilters ? 'Show less' : `+${hiddenCount} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
