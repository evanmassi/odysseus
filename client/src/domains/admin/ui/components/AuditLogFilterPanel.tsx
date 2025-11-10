/**
 * Audit Log Filter Panel Component
 *
 * Provides comprehensive filtering UI for audit logs with:
 * - Multi-select action filters grouped by entity
 * - Entity type filters with color-coded pills
 * - Username search
 * - Date range presets and custom dates
 * - Active filters summary with quick removal
 */

import React, { useState, useMemo, useCallback } from 'react';

import { ChevronDown, ChevronRight, X } from 'lucide-react';

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

// Filter chip component - styled based on action type
interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  actionValue?: string;
}

function FilterChip({ label, isSelected, onClick, actionValue }: FilterChipProps) {
  // Determine badge class based on action type
  const getActionBadgeClass = () => {
    if (!actionValue) return '';
    if (actionValue.includes('created')) return 'badge-action-created';
    if (actionValue.includes('updated')) return 'badge-action-updated';
    if (actionValue.includes('moved')) return 'badge-action-moved';
    if (actionValue.includes('deleted')) return 'badge-action-deleted';
    if (actionValue.includes('deactivated')) return 'badge-action-deleted';
    // Check unlinked BEFORE linked to avoid matching both
    if (actionValue.includes('unlinked') || actionValue.includes('logged_out')) return 'badge-action-logout';
    if (actionValue.includes('linked') || actionValue.includes('logged_in') || actionValue.includes('reactivated')) return 'badge-action-login';
    if (actionValue.includes('changed')) return 'badge-action-updated';
    return 'bg-gray-100 text-gray-700 border border-gray-300';
  };

  const badgeClass = getActionBadgeClass();

  return (
    <button
      onClick={onClick}
      className={`
        px-1.5 py-0.5 rounded text-[10px] font-medium transition-all
        ${isSelected ? 'ring-2 ring-action ring-offset-1' : 'opacity-80 hover:opacity-100'}
        ${badgeClass || (isSelected ? 'bg-action text-white shadow-sm hover:bg-action-hover' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300')}
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

function EntityPill({ label, entityType, isSelected, onClick }: EntityPillProps) {
  const getBadgeClass = () => {
    if (entityType === 'tube') return 'badge-entity-tube';
    if (entityType === 'user') return 'badge-entity-user';
    if (entityType === 'researcher') return 'badge-entity-researcher';
    if (entityType === 'storage') return 'badge-entity-tank';
    return 'badge';
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${getBadgeClass()}
        transition-all cursor-pointer
        ${isSelected ? 'ring-2 ring-action ring-offset-1' : 'opacity-70 hover:opacity-100'}
      `}
    >
      {label}
    </button>
  );
}

// Active filter chip component
interface ActiveFilterChipProps {
  label: string;
  onRemove: () => void;
}

function ActiveFilterChip({ label, onRemove }: ActiveFilterChipProps) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-600 text-white hover:bg-slate-700 transition-all"
      title={`Remove ${label}`}
    >
      <span>{label}</span>
      <X className="w-2.5 h-2.5" />
    </button>
  );
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, count, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        {count > 0 && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {count}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function AuditLogFilterPanel({ filters, onChange, onApply, onClear }: AuditLogFilterPanelProps) {
  // Collapsible section state
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
  const entityTypes = useMemo(() => [
    { value: 'tube', label: 'Tube' },
    { value: 'storage', label: 'Storage' },
    { value: 'user', label: 'User' },
    { value: 'researcher', label: 'Researcher' },
  ], []);

  // Date presets
  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last6months', label: 'Last 6 Months' },
    { value: 'lastyear', label: 'Last Year' },
    { value: 'alltime', label: 'All Time' },
  ];

  // Toggle action in multi-select
  const toggleAction = useCallback((action: string) => {
    const actions = filters.actions || [];
    const newActions = actions.includes(action)
      ? actions.filter(a => a !== action)
      : [...actions, action];
    onChange({ ...filters, actions: newActions.length > 0 ? newActions : undefined });
  }, [filters, onChange]);

  // Toggle entity type in multi-select
  const toggleEntityType = useCallback((entityType: string) => {
    const entityTypes = filters.entityTypes || [];
    const newEntityTypes = entityTypes.includes(entityType)
      ? entityTypes.filter(e => e !== entityType)
      : [...entityTypes, entityType];
    onChange({ ...filters, entityTypes: newEntityTypes.length > 0 ? newEntityTypes : undefined });
  }, [filters, onChange]);

  // Apply date preset
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
      datePreset: preset
    });
  };

  // Toggle section
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Count active filters per section
  const getSectionCount = (section: string): number => {
    switch (section) {
      case 'actions':
        return filters.actions?.length || 0;
      case 'entityTypes':
        return filters.entityTypes?.length || 0;
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
          onRemove: () => toggleAction(action)
        });
      }
    });

    // Entity type filters
    filters.entityTypes?.forEach(entityType => {
      const entity = entityTypes.find(e => e.value === entityType);
      if (entity) {
        result.push({
          label: entity.label,
          onRemove: () => toggleEntityType(entityType)
        });
      }
    });

    // Username filter
    if (filters.username) {
      result.push({
        label: `User: ${filters.username}`,
        onRemove: () => onChange({ ...filters, username: undefined })
      });
    }

    // Date filters
    if (filters.dateFrom) {
      result.push({
        label: `From: ${filters.dateFrom.slice(0, 10)}`,
        onRemove: () => onChange({ ...filters, dateFrom: undefined })
      });
    }

    if (filters.dateTo) {
      result.push({
        label: `To: ${filters.dateTo.slice(0, 10)}`,
        onRemove: () => onChange({ ...filters, dateTo: undefined })
      });
    }

    return result;
  }, [filters, actionGroups.tube, actionGroups.storage, actionGroups.researcher, actionGroups.user, entityTypes, toggleAction, toggleEntityType, onChange]);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg">
        <h4 className="text-sm font-bold text-gray-900">Filters</h4>
      </div>

      {/* Filter Sections - 2x2 Grid Layout */}
      <div className="max-h-96 overflow-y-auto">
        {/* Row 1: User and Item */}
        <div className="grid grid-cols-2 gap-0 border-b border-gray-200">
          {/* USER SECTION */}
          <CollapsibleSection
            title="User"
            count={getSectionCount('user')}
            isOpen={openSections.user}
            onToggle={() => toggleSection('user')}
          >
            <input
              type="text"
              placeholder="Filter by username"
              value={filters.username || ''}
              onChange={(e) => onChange({ ...filters, username: e.target.value || undefined })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
            />
          </CollapsibleSection>

          {/* ITEM SECTION */}
          <CollapsibleSection
            title="Item"
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
                  isSelected={filters.entityTypes?.includes(entity.value) || false}
                  onClick={() => toggleEntityType(entity.value)}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* Row 2: Action and Date */}
        <div className="grid grid-cols-2 gap-0">
          {/* ACTION SECTION */}
          <CollapsibleSection
            title="Action"
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
                {openSections.tubeActions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="text-xs font-medium text-gray-700">Tube</span>
                {getEntityActionCount('tube') > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
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
                      isSelected={filters.actions?.includes(action.value) || false}
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
                {openSections.storageActions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="text-xs font-medium text-gray-700">Storage</span>
                {getEntityActionCount('storage') > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
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
                      isSelected={filters.actions?.includes('tank_created') || false}
                      onClick={() => toggleAction('tank_created')}
                    />
                    <FilterChip
                      label="Tank Updated"
                      actionValue="tank_updated"
                      isSelected={filters.actions?.includes('tank_updated') || false}
                      onClick={() => toggleAction('tank_updated')}
                    />
                    <FilterChip
                      label="Tank Deleted"
                      actionValue="tank_deleted"
                      isSelected={filters.actions?.includes('tank_deleted') || false}
                      onClick={() => toggleAction('tank_deleted')}
                    />
                  </div>
                  {/* Rack actions */}
                  <div className="flex flex-wrap gap-1">
                    <FilterChip
                      label="Rack Created"
                      actionValue="rack_created"
                      isSelected={filters.actions?.includes('rack_created') || false}
                      onClick={() => toggleAction('rack_created')}
                    />
                    <FilterChip
                      label="Rack Updated"
                      actionValue="rack_updated"
                      isSelected={filters.actions?.includes('rack_updated') || false}
                      onClick={() => toggleAction('rack_updated')}
                    />
                    <FilterChip
                      label="Rack Deleted"
                      actionValue="rack_deleted"
                      isSelected={filters.actions?.includes('rack_deleted') || false}
                      onClick={() => toggleAction('rack_deleted')}
                    />
                  </div>
                  {/* Box actions */}
                  <div className="flex flex-wrap gap-1">
                    <FilterChip
                      label="Box Created"
                      actionValue="box_created"
                      isSelected={filters.actions?.includes('box_created') || false}
                      onClick={() => toggleAction('box_created')}
                    />
                    <FilterChip
                      label="Box Updated"
                      actionValue="box_updated"
                      isSelected={filters.actions?.includes('box_updated') || false}
                      onClick={() => toggleAction('box_updated')}
                    />
                    <FilterChip
                      label="Box Deleted"
                      actionValue="box_deleted"
                      isSelected={filters.actions?.includes('box_deleted') || false}
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
                {openSections.userActions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="text-xs font-medium text-gray-700">User</span>
                {getEntityActionCount('user') > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
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
                      isSelected={filters.actions?.includes(action.value) || false}
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
                {openSections.researcherActions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="text-xs font-medium text-gray-700">Researcher</span>
                {getEntityActionCount('researcher') > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
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
                      isSelected={filters.actions?.includes(action.value) || false}
                      onClick={() => toggleAction(action.value)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

          {/* DATE SECTION */}
          <CollapsibleSection
            title="Date Range"
            count={getSectionCount('date')}
            isOpen={openSections.date}
            onToggle={() => toggleSection('date')}
          >
          <div className="space-y-3">
            {/* Quick Presets */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Quick Ranges</div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Quick date range presets">
                {datePresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => applyDatePreset(preset.value)}
                    className={`
                      px-2 py-1 text-xs rounded border transition-all
                      ${filters.datePreset === preset.value
                        ? 'bg-action text-white border-action shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
              <legend className="text-xs font-medium text-gray-600 mb-1">Custom Range</legend>
              <div className="space-y-2">
                <div>
                  <label htmlFor="audit-date-from" className="sr-only">From date</label>
                  <input
                    id="audit-date-from"
                    type="datetime-local"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined, datePreset: undefined })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
                    placeholder="From"
                    aria-label="Filter start date and time"
                  />
                </div>
                <div>
                  <label htmlFor="audit-date-to" className="sr-only">To date</label>
                  <input
                    id="audit-date-to"
                    type="datetime-local"
                    value={filters.dateTo || ''}
                    onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-action-focus focus:border-action-focus"
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

      {/* Active Filters Footer */}
      {hasActiveFilters && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Active Filters:</span>
            <button
              onClick={onClear}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter, idx) => (
              <ActiveFilterChip
                key={`${filter.label}-${idx}`}
                label={filter.label}
                onRemove={filter.onRemove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 p-3 border-t border-gray-200 bg-white rounded-b-lg">
        <button
          onClick={onClear}
          className="btn-refresh-compact flex items-center space-x-1"
        >
          <span>Cancel</span>
        </button>
        <button
          onClick={onApply}
          className="btn-refresh-compact flex items-center space-x-1 bg-action text-white border-action hover:bg-action-hover"
        >
          <span>Apply Filters</span>
        </button>
      </div>
    </div>
  );
}
