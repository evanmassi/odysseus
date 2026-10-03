/**
 * Filter Panel
 *
 * Collapsible filter sections for location, sample fields, researcher, and date range.
 */

import { useMemo, useState, useCallback } from 'react';

import {
  formatResearcherDropdownDisplay,
  formatStorageDisplayName,
} from '@odysseus/shared-schemas';
import {
  type LucideIcon,
  UsersRound,
  Calendar,
  X,
  TestTubeDiagonal,
  Barcode,
  CircleUserRound,
  Fingerprint,
  CircuitBoard,
  MapPin,
  Microscope,
  Dna,
  Building2,
} from 'lucide-react';

import { useActiveResearchersQuery } from '@domains/researchers';
import { useStorageData } from '@domains/storage';
import { useTubeFilterOptions } from '@domains/tubes';
import { Chip, DatePicker, Tooltip } from '@shared/ui';
import { FilterSection } from '@shared/ui/components/filters/FilterSection';
import { TankIcon, RackIcon, BoxIcon } from '@shared/ui/components/icons';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { normalizeDateString } from '@shared/utils/dateFormatters';

import { useSearchStore } from '../../stores/searchStore';

import type { Researcher, SearchFilters, TubeFilterableField } from '@odysseus/shared-schemas';

interface SampleFilterGroup {
  filterKey: keyof SearchFilters;
  tubeField: TubeFilterableField;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

const FILTER_FIELDS: TubeFilterableField[] = [
  'tankId',
  'rackId',
  'boxId',
  'cellType',
  'lotNumber',
  'donorInternalId',
  'donorSourceId',
  'cultureCondition',
  'species',
  'source',
];

const SAMPLE_FILTER_GROUPS: SampleFilterGroup[] = [
  {
    filterKey: 'cellTypes',
    tubeField: 'cellType',
    label: 'Cell Types',
    icon: Microscope,
    ariaLabel: 'Cell type filters',
  },
  {
    filterKey: 'lotNumbers',
    tubeField: 'lotNumber',
    label: 'Lot Numbers',
    icon: Barcode,
    ariaLabel: 'Lot number filters',
  },
  {
    filterKey: 'donorInternalIds',
    tubeField: 'donorInternalId',
    label: 'Donor Int. IDs',
    icon: CircleUserRound,
    ariaLabel: 'Donor internal ID filters',
  },
  {
    filterKey: 'donorSourceIds',
    tubeField: 'donorSourceId',
    label: 'Donor Src. IDs',
    icon: Fingerprint,
    ariaLabel: 'Donor source ID filters',
  },
  {
    filterKey: 'cultureConditions',
    tubeField: 'cultureCondition',
    label: 'Culture Conditions',
    icon: CircuitBoard,
    ariaLabel: 'Culture condition filters',
  },
  {
    filterKey: 'species',
    tubeField: 'species',
    label: 'Species',
    icon: Dna,
    ariaLabel: 'Species filters',
  },
  {
    filterKey: 'sources',
    tubeField: 'source',
    label: 'Sources',
    icon: Building2,
    ariaLabel: 'Source filters',
  },
];

interface SearchFilterPanelProps {
  onClose?: () => void;
}

export function SearchFilterPanel({ onClose }: SearchFilterPanelProps) {
  const { filters, toggleFilterValue, setSearchFilters, clearFilters } = useSearchStore();

  const [openSections, setOpenSections] = useState({
    location: false,
    sample: false,
    researcher: false,
    date: false,
  });

  const { data: filterOptionsData } = useTubeFilterOptions(FILTER_FIELDS);
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { getCurrentTanks } = useStorageData();
  const tanks = getCurrentTanks();

  const getTankName = useCallback(
    (tankId: string): string => {
      const tank = tanks.find(t => t.id === tankId);
      return tank?.name ?? `Tank ${tankId}`;
    },
    [tanks]
  );

  const getRackName = useCallback(
    (rackId: string): string => {
      for (const tank of tanks) {
        const rack = tank.racks?.find(r => r.id === rackId);
        if (rack) return formatStorageDisplayName(rack.name ?? `Rack ${rackId}`, rack.customLabel);
      }
      return `Rack ${rackId}`;
    },
    [tanks]
  );

  const getBoxName = useCallback(
    (boxId: string): string => {
      for (const tank of tanks) {
        for (const rack of tank.racks ?? []) {
          const box = rack.boxes?.find(b => b.id === boxId);
          if (box) return formatStorageDisplayName(box.name ?? `Box ${boxId}`, box.customLabel);
        }
      }
      return `Box ${boxId}`;
    },
    [tanks]
  );

  const filterOptions = useMemo(() => {
    return {
      tankIds: [...(filterOptionsData?.tankId ?? [])].sort((a, b) =>
        getTankName(a).localeCompare(getTankName(b), undefined, { numeric: true })
      ),
      rackIds: [...(filterOptionsData?.rackId ?? [])].sort((a, b) =>
        getRackName(a).localeCompare(getRackName(b), undefined, { numeric: true })
      ),
      boxIds: [...(filterOptionsData?.boxId ?? [])].sort((a, b) =>
        getBoxName(a).localeCompare(getBoxName(b), undefined, { numeric: true })
      ),
      sampleGroups: SAMPLE_FILTER_GROUPS.map(group => ({
        ...group,
        options: filterOptionsData?.[group.tubeField] ?? [],
      })),
      researchers: researchers || [],
    };
  }, [filterOptionsData, researchers, getTankName, getRackName, getBoxName]);

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

  const isSelected = (filterKey: keyof typeof filters, value: string): boolean => {
    const filterValue = filters[filterKey];
    return Array.isArray(filterValue) && filterValue.includes(value);
  };

  const getSectionCount = (section: 'location' | 'sample' | 'researcher' | 'date'): number => {
    switch (section) {
      case 'location':
        return (
          (filters.tankIds?.length ?? 0) +
          (filters.rackIds?.length ?? 0) +
          (filters.boxIds?.length ?? 0)
        );
      case 'sample':
        return SAMPLE_FILTER_GROUPS.reduce(
          (sum, { filterKey }) => sum + ((filters[filterKey] as string[] | undefined)?.length ?? 0),
          0
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

  interface ActiveFilter {
    category: string;
    label: string;
    onRemove: () => void;
  }

  const activeFilters = useMemo((): ActiveFilter[] => {
    const result: ActiveFilter[] = [];

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
        label: getRackName(rackId),
        onRemove: () => toggleFilterValue('rackIds', rackId),
      });
    });

    filters.boxIds?.forEach(boxId => {
      result.push({
        category: 'Location',
        label: getBoxName(boxId),
        onRemove: () => toggleFilterValue('boxIds', boxId),
      });
    });

    for (const { filterKey } of SAMPLE_FILTER_GROUPS) {
      (filters[filterKey] as string[] | undefined)?.forEach(value => {
        result.push({
          category: 'Sample',
          label: value,
          onRemove: () => toggleFilterValue(filterKey, value),
        });
      });
    }

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
  }, [
    filters,
    researchers,
    getTankName,
    getRackName,
    getBoxName,
    toggleFilterValue,
    updateDateFilter,
  ]);

  const hasActiveFilters = activeFilters.length > 0;

  const [showAllFilters, setShowAllFilters] = useState(false);
  const TRUNCATE_LIMIT = 6;
  const visibleFilters = showAllFilters ? activeFilters : activeFilters.slice(0, TRUNCATE_LIMIT);
  const hiddenCount = activeFilters.length - TRUNCATE_LIMIT;

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-line-faint px-4">
        <div className="flex items-center gap-2.5">
          <span className="type-label text-label-xs tracking-label-wide text-foreground/70">
            Filters
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip content="Clear all filters" side="bottom">
            <button
              onClick={clearFilters}
              className="px-2 py-1 type-label text-label-2xs text-foreground/55 transition-colors hover:text-primary"
            >
              Clear All
            </button>
          </Tooltip>
          {onClose && (
            <Tooltip content="Close filters" side="bottom">
              <button
                onClick={onClose}
                className="p-1 text-foreground/55 transition-colors hover:text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-1" tabIndex={-1}>
        <FilterSection
          title="Location"
          icon={<MapPin className="w-3.5 h-3.5" />}
          count={getSectionCount('location')}
          isOpen={openSections.location}
          onToggle={() => toggleSection('location')}
        >
          <div className="space-y-4">
            {filterOptions.tankIds.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-foreground/45">
                  <TankIcon className="h-3 w-3" aria-hidden="true" />
                  <div className="type-label text-label-2xs text-foreground/55">Tanks</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Tank filters">
                  {filterOptions.tankIds.map(tankId => (
                    <Chip
                      key={tankId}
                      behavior="selectable"
                      size="sm"
                      selected={isSelected('tankIds', tankId)}
                      onSelect={() => toggleFilterValue('tankIds', tankId)}
                    >
                      {getTankName(tankId)}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {filterOptions.rackIds.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-foreground/45">
                  <RackIcon className="h-3 w-3" aria-hidden="true" />
                  <div className="type-label text-label-2xs text-foreground/55">Racks</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Rack filters">
                  {filterOptions.rackIds.map(rackId => (
                    <Chip
                      key={rackId}
                      behavior="selectable"
                      size="sm"
                      selected={isSelected('rackIds', rackId)}
                      onSelect={() => toggleFilterValue('rackIds', rackId)}
                    >
                      {getRackName(rackId)}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {filterOptions.boxIds.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-foreground/45">
                  <BoxIcon className="h-3 w-3" aria-hidden="true" />
                  <div className="type-label text-label-2xs text-foreground/55">Boxes</div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Box filters">
                  {filterOptions.boxIds.map(boxId => (
                    <Chip
                      key={boxId}
                      behavior="selectable"
                      size="sm"
                      selected={isSelected('boxIds', boxId)}
                      onSelect={() => toggleFilterValue('boxIds', boxId)}
                    >
                      {getBoxName(boxId)}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FilterSection>

        <FilterSection
          title="Sample"
          icon={<TestTubeDiagonal className="w-3.5 h-3.5" />}
          count={getSectionCount('sample')}
          isOpen={openSections.sample}
          onToggle={() => toggleSection('sample')}
        >
          <div className="space-y-4">
            {filterOptions.sampleGroups.map(
              ({ filterKey, label, icon: Icon, ariaLabel, options }) =>
                options.length > 0 && (
                  <div key={filterKey}>
                    <div className="mb-2 flex items-center gap-2 text-foreground/45">
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      <div className="type-label text-label-2xs text-foreground/55">{label}</div>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
                      {options.map(value => (
                        <Chip
                          key={value}
                          behavior="selectable"
                          size="sm"
                          selected={isSelected(filterKey, value)}
                          onSelect={() => toggleFilterValue(filterKey, value)}
                        >
                          {value}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        </FilterSection>

        {filterOptions.researchers.length > 0 && (
          <FilterSection
            title="Researcher"
            icon={<UsersRound className="w-3.5 h-3.5" />}
            count={getSectionCount('researcher')}
            isOpen={openSections.researcher}
            onToggle={() => toggleSection('researcher')}
          >
            <div className="flex flex-wrap gap-2">
              {filterOptions.researchers.map((researcher: Researcher) => (
                <Chip
                  key={researcher.id}
                  behavior="selectable"
                  size="sm"
                  selected={isSelected('researcherIds', researcher.id)}
                  onSelect={() => toggleFilterValue('researcherIds', researcher.id)}
                >
                  {formatResearcherDropdownDisplay(researcher)}
                </Chip>
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection
          title="Date Range"
          icon={<Calendar className="w-3.5 h-3.5" />}
          count={getSectionCount('date')}
          isOpen={openSections.date}
          onToggle={() => toggleSection('date')}
        >
          <div className="space-y-3">
            <div>
              <span className="mb-1 block type-label text-label-2xs text-foreground/55">From</span>
              <DatePicker
                value={filters.dateFrom ?? ''}
                onChange={val => updateDateFilter('dateFrom', val)}
                aria-label="Filter start date"
                size="sm"
                fullWidth
                clearable
              />
            </div>
            <div>
              <span className="mb-1 block type-label text-label-2xs text-foreground/55">To</span>
              <DatePicker
                value={filters.dateTo ?? ''}
                onChange={val => updateDateFilter('dateTo', val)}
                aria-label="Filter end date"
                size="sm"
                fullWidth
                clearable
              />
            </div>
          </div>
        </FilterSection>
      </ScrollArea>

      {hasActiveFilters && (
        <div className="flex-shrink-0 border-t border-line-soft bg-foreground/[0.02] px-3 py-2">
          <div className="flex flex-wrap gap-1 items-center">
            {visibleFilters.map((filter, idx) => (
              <Tooltip
                content={`Remove ${filter.label}`}
                side="bottom"
                key={`${filter.category}-${idx}`}
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
