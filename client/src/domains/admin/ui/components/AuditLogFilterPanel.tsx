/**
 * Audit Log Filter Panel
 *
 * Multi-select filters for actions, entity types, users, and date ranges
 */
import React, { useState, useMemo, useCallback } from 'react';

import { ChevronDown, ChevronRight, X, UserRound, Zap, Box, Calendar } from 'lucide-react';

import { Button, Input, Tooltip } from '@shared/ui';

export interface AuditFilterState {
  actions?: string[];
  entityTypes?: string[];
  username?: string;
  dateFrom?: string;
  dateTo?: string;
  datePreset?: string;
}

interface AuditLogFilterPanelProps {
  filters: AuditFilterState;
  onChange: (filters: AuditFilterState) => void;
  onApply: () => void;
  onClear: () => void;
}

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  actionValue?: string;
}

function FilterChip({ label, isSelected, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-0.5 rounded-full text-xs font-medium transition-all focus-ring-default
        ${
          isSelected
            ? 'bg-action text-white shadow-sm hover:bg-action-hover'
            : 'bg-muted text-secondary-foreground hover:bg-secondary border border-border'
        }
      `}
    >
      {label}
    </button>
  );
}

// Entity type pill with color coding - uses exact table badge styles
interface EntityPillProps {
  label: string;
  entityType: string;
  isSelected: boolean;
  onClick: () => void;
}

function EntityPill({ label, isSelected, onClick }: EntityPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-0.5 rounded-full text-xs font-medium transition-all focus-ring-default
        ${
          isSelected
            ? 'bg-action text-white shadow-sm hover:bg-action-hover'
            : 'bg-muted text-secondary-foreground hover:bg-secondary border border-border'
        }
      `}
    >
      {label}
    </button>
  );
}

interface ActiveFilterChipProps {
  label: string;
  onRemove: () => void;
}

function ActiveFilterChip({ label, onRemove }: ActiveFilterChipProps) {
  return (
    <Tooltip content={`Remove ${label}`} side="bottom">
      <button
        onClick={onRemove}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-chip-active text-chip-active-foreground hover:bg-chip-active-hover transition-all focus-ring-default"
      >
        <span>{label}</span>
        <X className="w-2.5 h-2.5" />
      </button>
    </Tooltip>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
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
    <div className="border-b border-border last:border-b-0">
      <div className="p-1">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between py-2 px-2 rounded hover:bg-accent transition-colors focus-ring-default"
        >
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="flex items-center space-x-2">
              {icon}
              <span className="text-sm font-semibold text-card-foreground">{title}</span>
            </div>
          </div>
          {count > 0 && (
            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
              {count}
            </span>
          )}
        </button>
      </div>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function AuditLogFilterPanel({
  filters,
  onChange,
  onApply: _onApply,
  onClear,
}: AuditLogFilterPanelProps) {
  const [openSections, setOpenSections] = useState({
    actions: false,
    entityTypes: true,
    user: true,
    date: false,
    // Action subsections
    tubeActions: false,
    storageActions: false,
    userActions: false,
    researcherActions: false,
  });

  // Action definitions grouped by entity
  const actionGroups = {
    tube: [
      { value: 'tube_created', label: 'Created' },
      { value: 'tube_updated', label: 'Updated' },
      { value: 'tube_moved', label: 'Moved' },
      { value: 'tube_deleted', label: 'Deleted' },
      { value: 'tube_bulk_updated', label: 'Bulk Updated' },
    ],
    storage: [
      { value: 'tank_created', label: 'Tank Created' },
      { value: 'tank_updated', label: 'Tank Updated' },
      { value: 'tank_deleted', label: 'Tank Deleted' },
      { value: 'rack_created', label: 'Rack Created' },
      { value: 'rack_updated', label: 'Rack Updated' },
      { value: 'rack_deleted', label: 'Rack Deleted' },
      { value: 'box_created', label: 'Box Created' },
      { value: 'box_updated', label: 'Box Updated' },
      { value: 'box_deleted', label: 'Box Deleted' },
      { value: 'lab_name_changed', label: 'Lab Name Changed' },
    ],
    researcher: [
      { value: 'researcher_created', label: 'Created' },
      { value: 'researcher_updated', label: 'Updated' },
      { value: 'researcher_deactivated', label: 'Deactivated' },
      { value: 'researcher_reactivated', label: 'Reactivated' },
    ],
    user: [
      { value: 'user_created', label: 'Created' },
      { value: 'user_logged_in', label: 'Login' },
      { value: 'user_logged_out', label: 'Logout' },
      { value: 'user_role_changed', label: 'Role Changed' },
      { value: 'user_password_changed', label: 'Password Changed' },
      { value: 'user_linked_to_researcher', label: 'Linked' },
      { value: 'user_unlinked_from_researcher', label: 'Unlinked' },
      { value: 'user_deleted', label: 'Deleted' },
    ],
  };

  // Entity types - reordered to match action sections
  const entityTypes = useMemo(
    () => [
      { value: 'tube', label: 'Tube' },
      { value: 'storage', label: 'Storage' },
      { value: 'user', label: 'User' },
      { value: 'researcher', label: 'Researcher' },
    ],
    []
  );

  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last6months', label: 'Last 6 Months' },
    { value: 'lastyear', label: 'Last Year' },
    { value: 'alltime', label: 'All Time' },
  ];

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
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last6months':
        dateFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'lastyear':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
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

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Count active filters per section
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

  // Count actions per entity group
  const getEntityActionCount = (entity: string): number => {
    if (!filters.actions) return 0;
    const prefix = entity === 'storage' ? ['tank_', 'rack_', 'box_', 'lab_'] : [`${entity}_`];
    return filters.actions.filter(action => prefix.some(p => action.startsWith(p))).length;
  };

  // Build active filters list
  const activeFilters = useMemo(() => {
    const result: Array<{ label: string; onRemove: () => void }> = [];

    // Action filters
    filters.actions?.forEach(action => {
      const allActions = [
        ...actionGroups.tube,
        ...actionGroups.storage,
        ...actionGroups.researcher,
        ...actionGroups.user,
      ];
      const actionDef = allActions.find(a => a.value === action);
      if (actionDef) {
        result.push({
          label: actionDef.label,
          onRemove: () => toggleAction(action),
        });
      }
    });

    // Entity type filters
    filters.entityTypes?.forEach(entityType => {
      const entity = entityTypes.find(e => e.value === entityType);
      if (entity) {
        result.push({
          label: entity.label,
          onRemove: () => toggleEntityType(entityType),
        });
      }
    });

    // Username filter
    if (filters.username) {
      result.push({
        label: `User: ${filters.username}`,
        onRemove: () => onChange({ ...filters, username: undefined }),
      });
    }

    // Date filters
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
  }, [
    filters,
    actionGroups.tube,
    actionGroups.storage,
    actionGroups.researcher,
    actionGroups.user,
    entityTypes,
    toggleAction,
    toggleEntityType,
    onChange,
  ]);

  const hasActiveFilters = activeFilters.length > 0;

  // Smart truncation for active filters
  const [showAllFilters, setShowAllFilters] = useState(false);
  const TRUNCATE_LIMIT = 6;
  const visibleFilters = showAllFilters ? activeFilters : activeFilters.slice(0, TRUNCATE_LIMIT);
  const hiddenCount = activeFilters.length - TRUNCATE_LIMIT;

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted rounded-t-lg">
        <h4 className="text-sm font-bold text-card-foreground">Filters</h4>
        <Tooltip content="Clear all filters" side="bottom">
          <Button variant="ghost" size="xs" onClick={onClear}>
            Clear All
          </Button>
        </Tooltip>
      </div>

      {/* Filter Sections - 2 Column Grid */}
      <div className="max-h-96 overflow-y-auto p-1" tabIndex={-1}>
        <div className="grid grid-cols-2">
          {/* Left Column: User & Action */}
          <div className="border-r border-border">
            {/* USER SECTION */}
            <CollapsibleSection
              title="User"
              icon={<UserRound className="w-4 h-4 text-muted-foreground" />}
              count={getSectionCount('user')}
              isOpen={openSections.user}
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

            {/* ACTION SECTION */}
            <CollapsibleSection
              title="Action"
              icon={<Zap className="w-4 h-4 text-muted-foreground" />}
              count={getSectionCount('actions')}
              isOpen={openSections.actions}
              onToggle={() => toggleSection('actions')}
            >
              <div className="space-y-3">
                {/* Tube */}
                <div>
                  <button
                    onClick={() => toggleSection('tubeActions')}
                    className="flex items-center space-x-1 mb-2 hover:text-action transition-colors"
                  >
                    {openSections.tubeActions ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium text-secondary-foreground">Tube</span>
                    {getEntityActionCount('tube') > 0 && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                        {getEntityActionCount('tube')}
                      </span>
                    )}
                  </button>
                  {openSections.tubeActions && (
                    <div className="flex flex-wrap gap-1 ml-4">
                      {actionGroups.tube.map(action => (
                        <FilterChip
                          key={action.value}
                          label={action.label}
                          actionValue={action.value}
                          isSelected={filters.actions?.includes(action.value) ?? false}
                          onClick={() => toggleAction(action.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Storage */}
                <div>
                  <button
                    onClick={() => toggleSection('storageActions')}
                    className="flex items-center space-x-1 mb-2 hover:text-action transition-colors"
                  >
                    {openSections.storageActions ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium text-secondary-foreground">Storage</span>
                    {getEntityActionCount('storage') > 0 && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                        {getEntityActionCount('storage')}
                      </span>
                    )}
                  </button>
                  {openSections.storageActions && (
                    <div className="ml-4 space-y-1">
                      {/* Tank actions */}
                      <div className="flex flex-wrap gap-1">
                        <FilterChip
                          label="Tank Created"
                          actionValue="tank_created"
                          isSelected={filters.actions?.includes('tank_created') ?? false}
                          onClick={() => toggleAction('tank_created')}
                        />
                        <FilterChip
                          label="Tank Updated"
                          actionValue="tank_updated"
                          isSelected={filters.actions?.includes('tank_updated') ?? false}
                          onClick={() => toggleAction('tank_updated')}
                        />
                        <FilterChip
                          label="Tank Deleted"
                          actionValue="tank_deleted"
                          isSelected={filters.actions?.includes('tank_deleted') ?? false}
                          onClick={() => toggleAction('tank_deleted')}
                        />
                      </div>
                      {/* Rack actions */}
                      <div className="flex flex-wrap gap-1">
                        <FilterChip
                          label="Rack Created"
                          actionValue="rack_created"
                          isSelected={filters.actions?.includes('rack_created') ?? false}
                          onClick={() => toggleAction('rack_created')}
                        />
                        <FilterChip
                          label="Rack Updated"
                          actionValue="rack_updated"
                          isSelected={filters.actions?.includes('rack_updated') ?? false}
                          onClick={() => toggleAction('rack_updated')}
                        />
                        <FilterChip
                          label="Rack Deleted"
                          actionValue="rack_deleted"
                          isSelected={filters.actions?.includes('rack_deleted') ?? false}
                          onClick={() => toggleAction('rack_deleted')}
                        />
                      </div>
                      {/* Box actions */}
                      <div className="flex flex-wrap gap-1">
                        <FilterChip
                          label="Box Created"
                          actionValue="box_created"
                          isSelected={filters.actions?.includes('box_created') ?? false}
                          onClick={() => toggleAction('box_created')}
                        />
                        <FilterChip
                          label="Box Updated"
                          actionValue="box_updated"
                          isSelected={filters.actions?.includes('box_updated') ?? false}
                          onClick={() => toggleAction('box_updated')}
                        />
                        <FilterChip
                          label="Box Deleted"
                          actionValue="box_deleted"
                          isSelected={filters.actions?.includes('box_deleted') ?? false}
                          onClick={() => toggleAction('box_deleted')}
                        />
                      </div>
                      {/* Lab name change */}
                      <div className="flex flex-wrap gap-1">
                        <FilterChip
                          label="Lab Name Changed"
                          actionValue="lab_name_changed"
                          isSelected={filters.actions?.includes('lab_name_changed') ?? false}
                          onClick={() => toggleAction('lab_name_changed')}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* User */}
                <div>
                  <button
                    onClick={() => toggleSection('userActions')}
                    className="flex items-center space-x-1 mb-2 hover:text-action transition-colors"
                  >
                    {openSections.userActions ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium text-secondary-foreground">User</span>
                    {getEntityActionCount('user') > 0 && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                        {getEntityActionCount('user')}
                      </span>
                    )}
                  </button>
                  {openSections.userActions && (
                    <div className="flex flex-wrap gap-1 ml-4">
                      {actionGroups.user.map(action => (
                        <FilterChip
                          key={action.value}
                          label={action.label}
                          actionValue={action.value}
                          isSelected={filters.actions?.includes(action.value) ?? false}
                          onClick={() => toggleAction(action.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Researcher */}
                <div>
                  <button
                    onClick={() => toggleSection('researcherActions')}
                    className="flex items-center space-x-1 mb-2 hover:text-action transition-colors"
                  >
                    {openSections.researcherActions ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium text-secondary-foreground">
                      Researcher
                    </span>
                    {getEntityActionCount('researcher') > 0 && (
                      <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                        {getEntityActionCount('researcher')}
                      </span>
                    )}
                  </button>
                  {openSections.researcherActions && (
                    <div className="flex flex-wrap gap-1 ml-4">
                      {actionGroups.researcher.map(action => (
                        <FilterChip
                          key={action.value}
                          label={action.label}
                          actionValue={action.value}
                          isSelected={filters.actions?.includes(action.value) ?? false}
                          onClick={() => toggleAction(action.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Right Column: Item & Date */}
          <div>
            {/* ITEM SECTION */}
            <CollapsibleSection
              title="Item"
              icon={<Box className="w-4 h-4 text-muted-foreground" />}
              count={getSectionCount('entityTypes')}
              isOpen={openSections.entityTypes}
              onToggle={() => toggleSection('entityTypes')}
            >
              <div className="flex flex-wrap gap-2">
                {entityTypes.map(entity => (
                  <EntityPill
                    key={entity.value}
                    label={entity.label}
                    entityType={entity.value}
                    isSelected={filters.entityTypes?.includes(entity.value) ?? false}
                    onClick={() => toggleEntityType(entity.value)}
                  />
                ))}
              </div>
            </CollapsibleSection>

            {/* DATE SECTION */}
            <CollapsibleSection
              title="Date Range"
              icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
              count={getSectionCount('date')}
              isOpen={openSections.date}
              onToggle={() => toggleSection('date')}
            >
              <div className="space-y-3">
                {/* Quick Presets */}
                <div>
                  <div className="text-xs font-medium text-secondary-foreground mb-2">
                    Quick Ranges
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Quick date range presets"
                  >
                    {datePresets.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => applyDatePreset(preset.value)}
                        className={`
                          px-2 py-0.5 text-xs rounded-full font-medium transition-all focus-ring-default
                          ${
                            filters.datePreset === preset.value
                              ? 'bg-action text-white shadow-sm hover:bg-action-hover'
                              : 'bg-muted text-secondary-foreground hover:bg-secondary border border-border'
                          }
                        `}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                <fieldset className="border-0 p-0 m-0">
                  <legend className="text-xs font-medium text-secondary-foreground mb-1">
                    Custom Range
                  </legend>
                  <div className="space-y-2">
                    <div>
                      <label htmlFor="audit-date-from" className="sr-only">
                        From date
                      </label>
                      <input
                        id="audit-date-from"
                        type="datetime-local"
                        value={filters.dateFrom ?? ''}
                        onChange={e =>
                          onChange({
                            ...filters,
                            dateFrom: e.target.value || undefined,
                            datePreset: undefined,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-border rounded focus-ring-default"
                        placeholder="From"
                        aria-label="Filter start date and time"
                      />
                    </div>
                    <div>
                      <label htmlFor="audit-date-to" className="sr-only">
                        To date
                      </label>
                      <input
                        id="audit-date-to"
                        type="datetime-local"
                        value={filters.dateTo ?? ''}
                        onChange={e =>
                          onChange({ ...filters, dateTo: e.target.value || undefined })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-border rounded focus-ring-default"
                        placeholder="To"
                        aria-label="Filter end date and time"
                      />
                    </div>
                  </div>
                </fieldset>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Active Filters Summary - Footer */}
      {hasActiveFilters && (
        <div className="px-3 py-2 bg-muted border-t border-border rounded-b-lg">
          <div className="flex flex-wrap gap-1 items-center">
            {visibleFilters.map((filter, idx) => (
              <ActiveFilterChip
                key={`${filter.label}-${idx}`}
                label={filter.label}
                onRemove={filter.onRemove}
              />
            ))}
            {hiddenCount > 0 && (
              <Button variant="ghost" size="xs" onClick={() => setShowAllFilters(!showAllFilters)}>
                {showAllFilters ? 'Show less' : `+${hiddenCount} more`}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
