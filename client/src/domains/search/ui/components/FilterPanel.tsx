import { useMemo, useState, useCallback } from 'react';

import { formatResearcherDropdownDisplay } from '@odysseus/shared-schemas';
import {
  UsersRound,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  TestTube,
  Barcode,
  CircleUserRound,
  Fingerprint,
  CircuitBoard,
  MapPin,
  Microscope,
} from 'lucide-react';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useSearchStore } from '@domains/search';
import { useStorageData } from '@domains/storage';
import { useTubes } from '@domains/tubes/hooks';
import { Tooltip } from '@shared/ui';
import { TankIcon, RackIcon, BoxIcon } from '@shared/ui/components/icons';
import { normalizeDateString } from '@shared/utils/dateUtils';

import type { TubeData, Researcher } from '@odysseus/shared-schemas';

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  showRemove?: boolean;
}

function FilterChip({ label, isSelected, onClick, showRemove = false }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-1.5 py-0.5 rounded-full text-xs font-medium transition-all focus-ring-default
        ${
          isSelected
            ? 'bg-action text-white shadow-sm hover:bg-action-hover'
            : 'bg-muted text-secondary-foreground hover:bg-secondary border border-border'
        }
        ${showRemove ? 'flex items-center space-x-1.5' : ''}
      `}
    >
      <span>{label}</span>
      {showRemove && <X className="w-3 h-3" />}
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
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary-foreground text-background hover:bg-foreground transition-all focus-ring-default"
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
            <div className="flex items-center space-x-2 text-muted-foreground">
              {icon}
              <span className="text-sm font-medium text-secondary-foreground">{title}</span>
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

interface FilterPanelProps {
  onClose?: () => void;
}

export function FilterPanel({ onClose }: FilterPanelProps = {}) {
  const { filters, toggleFilterValue, setSearchFilters, clearFilters } = useSearchStore();

  // Collapsible section state - start with Location open
  const [openSections, setOpenSections] = useState({
    location: true,
    sample: false,
    researcher: false,
    date: false,
  });

  // Server state from React Query
  const { data: tubes = [] } = useTubes(
    {},
    {
      staleTime: 5 * 60 * 1000,
    }
  );
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { getCurrentTanks } = useStorageData();
  const tanks = getCurrentTanks();

  // Extract unique filter options from tubes
  const filterOptions = useMemo(
    () => ({
      tankIds: Array.from(
        new Set(tubes?.map((tube: TubeData) => tube.location?.tankId).filter(Boolean) || [])
      ).sort(),
      rackIds: Array.from(new Set(tubes?.map((tube: TubeData) => tube.location?.rackId) || []))
        .filter(Boolean)
        .sort(),
      boxIds: Array.from(
        new Set(tubes?.map((tube: TubeData) => tube.location?.boxId).filter(Boolean) || [])
      ).sort(),
      cellTypes: Array.from(
        new Set(
          tubes
            ?.map((tube: TubeData) => tube.sample?.cellType)
            .filter((c): c is string => Boolean(c)) || []
        )
      ).sort(),
      lotNumbers: Array.from(
        new Set(
          tubes
            ?.map((tube: TubeData) => tube.sample?.lotNumber)
            .filter((c): c is string => Boolean(c)) || []
        )
      ).sort(),
      donorInternalIds: Array.from(
        new Set(
          tubes
            ?.map((tube: TubeData) => tube.sample?.donorInternalId)
            .filter((c): c is string => Boolean(c)) || []
        )
      ).sort(),
      donorSourceIds: Array.from(
        new Set(
          tubes
            ?.map((tube: TubeData) => tube.sample?.donorSourceId)
            .filter((c): c is string => Boolean(c)) || []
        )
      ).sort(),
      cultureConditions: Array.from(
        new Set(
          tubes
            ?.map((tube: TubeData) => tube.sample?.cultureCondition)
            .filter((c): c is string => Boolean(c)) || []
        )
      ).sort(),
      researchers: researchers || [],
    }),
    [tubes, researchers]
  );

  // Get tank name from ID
  const getTankName = useCallback(
    (tankId: string): string => {
      const tank = tanks.find(t => t.id === tankId);
      return tank?.name ?? `Tank ${tankId}`;
    },
    [tanks]
  );

  // Update date filter
  const updateDateFilter = useCallback(
    (field: 'dateFrom' | 'dateTo', value: string) => {
      const normalized = normalizeDateString(value);
      setSearchFilters({
        ...filters,
        [field]: normalized || undefined,
      });
    },
    [filters, setSearchFilters]
  );

  // Check if a value is selected in an array filter
  const isSelected = (filterKey: keyof typeof filters, value: string): boolean => {
    const filterValue = filters[filterKey];
    return Array.isArray(filterValue) && filterValue.includes(value);
  };

  // Get count of active items in a filter section
  const getSectionCount = (section: 'location' | 'sample' | 'researcher' | 'date'): number => {
    switch (section) {
      case 'location':
        return (
          (filters.tankIds?.length ?? 0) +
          (filters.rackIds?.length ?? 0) +
          (filters.boxIds?.length ?? 0)
        );
      case 'sample':
        return (
          (filters.cellTypes?.length ?? 0) +
          (filters.lotNumbers?.length ?? 0) +
          (filters.donorInternalIds?.length ?? 0) +
          (filters.donorSourceIds?.length ?? 0) +
          (filters.cultureConditions?.length ?? 0)
        );
      case 'researcher':
        return filters.researcherIds?.length ?? 0;
      case 'date':
        return (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);
      default:
        return 0;
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Build active filters list grouped by category
  interface ActiveFilter {
    category: string;
    label: string;
    onRemove: () => void;
  }

  const activeFilters = useMemo((): ActiveFilter[] => {
    const result: ActiveFilter[] = [];

    // Location filters
    filters.tankIds?.forEach(tankId => {
      result.push({
        category: 'Location',
        label: getTankName(tankId),
        onRemove: () => toggleFilterValue('tankIds', tankId),
      });
    });

    filters.rackIds?.forEach(rackId => {
      result.push({
        category: 'Location',
        label: `Rack ${rackId}`,
        onRemove: () => toggleFilterValue('rackIds', rackId),
      });
    });

    filters.boxIds?.forEach(boxId => {
      result.push({
        category: 'Location',
        label: `Box ${boxId}`,
        onRemove: () => toggleFilterValue('boxIds', boxId),
      });
    });

    // Sample filters
    filters.cellTypes?.forEach(cellType => {
      result.push({
        category: 'Sample',
        label: cellType,
        onRemove: () => toggleFilterValue('cellTypes', cellType),
      });
    });

    filters.lotNumbers?.forEach(lotNumber => {
      result.push({
        category: 'Sample',
        label: lotNumber,
        onRemove: () => toggleFilterValue('lotNumbers', lotNumber),
      });
    });

    filters.donorInternalIds?.forEach(donorId => {
      result.push({
        category: 'Sample',
        label: donorId,
        onRemove: () => toggleFilterValue('donorInternalIds', donorId),
      });
    });

    filters.donorSourceIds?.forEach(donorId => {
      result.push({
        category: 'Sample',
        label: donorId,
        onRemove: () => toggleFilterValue('donorSourceIds', donorId),
      });
    });

    filters.cultureConditions?.forEach(condition => {
      result.push({
        category: 'Sample',
        label: condition,
        onRemove: () => toggleFilterValue('cultureConditions', condition),
      });
    });

    // Researcher filters
    filters.researcherIds?.forEach(researcherId => {
      const researcher = researchers.find(r => r.id === researcherId);
      if (researcher) {
        result.push({
          category: 'Researcher',
          label: formatResearcherDropdownDisplay(researcher),
          onRemove: () => toggleFilterValue('researcherIds', researcherId),
        });
      }
    });

    // Date filters
    if (filters.dateFrom) {
      result.push({
        category: 'Date',
        label: `From: ${filters.dateFrom}`,
        onRemove: () => updateDateFilter('dateFrom', ''),
      });
    }

    if (filters.dateTo) {
      result.push({
        category: 'Date',
        label: `To: ${filters.dateTo}`,
        onRemove: () => updateDateFilter('dateTo', ''),
      });
    }

    return result;
  }, [filters, researchers, getTankName, toggleFilterValue, updateDateFilter]);

  const hasActiveFilters = activeFilters.length > 0;

  // Smart truncation state
  const [showAllFilters, setShowAllFilters] = useState(false);
  const TRUNCATE_LIMIT = 6;
  const visibleFilters = showAllFilters ? activeFilters : activeFilters.slice(0, TRUNCATE_LIMIT);
  const hiddenCount = activeFilters.length - TRUNCATE_LIMIT;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Clear All and Close buttons - Fixed */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted flex-shrink-0">
        <span className="text-xs font-medium text-secondary-foreground">Filters</span>
        <div className="flex items-center space-x-2">
          <Tooltip content="Clear all filters" side="bottom">
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs text-secondary-foreground hover:text-foreground hover:bg-accent rounded transition-colors focus-ring-default"
            >
              Clear All
            </button>
          </Tooltip>
          {onClose && (
            <Tooltip content="Close filters" side="bottom">
              <button
                onClick={onClose}
                className="p-1 text-secondary-foreground hover:text-foreground hover:bg-secondary rounded transition-colors focus-ring-default"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Filter Sections - Scrollable */}
      <div className="flex-1 overflow-y-auto p-1" tabIndex={-1}>
        {/* LOCATION SECTION */}
        <CollapsibleSection
          title="Location"
          icon={<MapPin className="w-4 h-4" />}
          count={getSectionCount('location')}
          isOpen={openSections.location}
          onToggle={() => toggleSection('location')}
        >
          <div className="space-y-4">
            {/* Tanks */}
            {filterOptions.tankIds.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <TankIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">Tanks</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Tank filters">
                  {filterOptions.tankIds.map(tankId => (
                    <FilterChip
                      key={tankId}
                      label={getTankName(tankId)}
                      isSelected={isSelected('tankIds', tankId)}
                      onClick={() => toggleFilterValue('tankIds', tankId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Racks */}
            {filterOptions.rackIds.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <RackIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">Racks</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Rack filters">
                  {filterOptions.rackIds.map(rackId => (
                    <FilterChip
                      key={rackId}
                      label={`Rack ${rackId}`}
                      isSelected={isSelected('rackIds', rackId)}
                      onClick={() => toggleFilterValue('rackIds', rackId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Boxes */}
            {filterOptions.boxIds.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <BoxIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">Boxes</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Box filters">
                  {filterOptions.boxIds.map(boxId => (
                    <FilterChip
                      key={boxId}
                      label={`Box ${boxId}`}
                      isSelected={isSelected('boxIds', boxId)}
                      onClick={() => toggleFilterValue('boxIds', boxId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* SAMPLE SECTION */}
        <CollapsibleSection
          title="Sample"
          icon={<TestTube className="w-4 h-4" />}
          count={getSectionCount('sample')}
          isOpen={openSections.sample}
          onToggle={() => toggleSection('sample')}
        >
          <div className="space-y-4">
            {/* Cell Types */}
            {filterOptions.cellTypes.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <Microscope className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">Cell Types</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Cell type filters">
                  {filterOptions.cellTypes.map(cellType => (
                    <FilterChip
                      key={cellType}
                      label={cellType}
                      isSelected={isSelected('cellTypes', cellType)}
                      onClick={() => toggleFilterValue('cellTypes', cellType)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Lot Numbers */}
            {filterOptions.lotNumbers.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <Barcode className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">Lot Numbers</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Lot number filters">
                  {filterOptions.lotNumbers.map(lotNumber => (
                    <FilterChip
                      key={lotNumber}
                      label={lotNumber}
                      isSelected={isSelected('lotNumbers', lotNumber)}
                      onClick={() => toggleFilterValue('lotNumbers', lotNumber)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Donor Internal IDs */}
            {filterOptions.donorInternalIds.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <CircleUserRound className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">
                    Donor Int. IDs
                  </div>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Donor internal ID filters"
                >
                  {filterOptions.donorInternalIds.map(donorId => (
                    <FilterChip
                      key={donorId}
                      label={donorId}
                      isSelected={isSelected('donorInternalIds', donorId)}
                      onClick={() => toggleFilterValue('donorInternalIds', donorId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Donor Source IDs */}
            {filterOptions.donorSourceIds.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <Fingerprint className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">
                    Donor Src. IDs
                  </div>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Donor source ID filters"
                >
                  {filterOptions.donorSourceIds.map(donorId => (
                    <FilterChip
                      key={donorId}
                      label={donorId}
                      isSelected={isSelected('donorSourceIds', donorId)}
                      onClick={() => toggleFilterValue('donorSourceIds', donorId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Culture Conditions */}
            {filterOptions.cultureConditions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
                  <CircuitBoard className="w-3.5 h-3.5" aria-hidden="true" />
                  <div className="text-xs font-medium text-secondary-foreground">
                    Culture Conditions
                  </div>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Culture condition filters"
                >
                  {filterOptions.cultureConditions.map(condition => (
                    <FilterChip
                      key={condition}
                      label={condition}
                      isSelected={isSelected('cultureConditions', condition)}
                      onClick={() => toggleFilterValue('cultureConditions', condition)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* RESEARCHER SECTION */}
        {filterOptions.researchers.length > 0 && (
          <CollapsibleSection
            title="Researcher"
            icon={<UsersRound className="w-4 h-4" />}
            count={getSectionCount('researcher')}
            isOpen={openSections.researcher}
            onToggle={() => toggleSection('researcher')}
          >
            <div className="flex flex-wrap gap-2">
              {filterOptions.researchers.map((researcher: Researcher) => (
                <FilterChip
                  key={researcher.id}
                  label={formatResearcherDropdownDisplay(researcher)}
                  isSelected={isSelected('researcherIds', researcher.id)}
                  onClick={() => toggleFilterValue('researcherIds', researcher.id)}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* DATE RANGE SECTION */}
        <CollapsibleSection
          title="Date Range"
          icon={<Calendar className="w-4 h-4" />}
          count={getSectionCount('date')}
          isOpen={openSections.date}
          onToggle={() => toggleSection('date')}
        >
          <div className="space-y-3">
            <div>
              <label
                htmlFor="filter-date-from"
                className="text-xs font-medium text-secondary-foreground mb-1 block"
              >
                From:
              </label>
              <input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={e => updateDateFilter('dateFrom', e.target.value)}
                className="w-full text-sm border border-border rounded-md p-2 input-form-field"
                aria-label="Filter start date"
              />
            </div>
            <div>
              <label
                htmlFor="filter-date-to"
                className="text-xs font-medium text-secondary-foreground mb-1 block"
              >
                To:
              </label>
              <input
                id="filter-date-to"
                type="date"
                value={filters.dateTo ?? ''}
                onChange={e => updateDateFilter('dateTo', e.target.value)}
                className="w-full text-sm border border-border rounded-md p-2 input-form-field"
                aria-label="Filter end date"
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Active Filters Summary - Pinned Footer */}
      {hasActiveFilters && (
        <div className="px-3 py-2 bg-muted border-t border-border flex-shrink-0">
          <div className="flex flex-wrap gap-1 items-center">
            {visibleFilters.map((filter, idx) => (
              <ActiveFilterChip
                key={`${filter.category}-${idx}`}
                label={filter.label}
                onRemove={filter.onRemove}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAllFilters(!showAllFilters)}
                className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground hover:bg-accent transition-all focus-ring-default"
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
