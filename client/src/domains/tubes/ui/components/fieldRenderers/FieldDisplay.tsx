/**
 * Field display components for read-only tube information
 *
 * Handles foreign key resolution (e.g., researcherId → researcher name)
 * using the Presenter/ViewModel pattern for clean separation of concerns.
 */

import React from 'react';

import {
  formatConcentrationDisplay,
  formatResearcherDropdownDisplay,
  type Researcher,
} from '@odysseus/shared-schemas';

import { formatDateForDisplay } from '@shared/utils/dateUtils';

import type { FieldConfig } from '../../../config/fieldConfig';

interface FieldDisplayProps {
  config: FieldConfig;
  value: string | number | undefined;
  unitValue?: string;
  researcherMap?: Map<string, Researcher>; // For resolving researcherId → researcher name
}

/**
 * Individual field display renderer
 */
export const FieldDisplay: React.FC<FieldDisplayProps> = ({
  config,
  value,
  unitValue,
  researcherMap,
}) => {
  // Don't render if value is empty
  if (!value && value !== 0) return null;

  const displayValue = () => {
    switch (config.type) {
      case 'date':
        return formatDateForDisplay(String(value));
      case 'concentration':
        return formatConcentrationDisplay(
          typeof value === 'number' ? value : undefined,
          unitValue as 'c/v' | 'c/mL' | undefined
        );
      case 'select':
        // Resolve foreign keys (researcherId → researcher name)
        if (config.key === 'researcherId' && researcherMap) {
          const researcherId = String(value);
          const researcher = researcherMap.get(researcherId);
          if (researcher) {
            // Use shared formatter for consistent display across the app
            return formatResearcherDropdownDisplay(researcher);
          }
          // Fallback if researcher not found (edge case: deleted researcher)
          return `Unknown (ID: ${researcherId})`;
        }
        return String(value);
      default:
        return String(value);
    }
  };

  return (
    <div>
      {config.label && (
        <span className="font-medium text-odysseus-muted uppercase tracking-wider text-[10.5px]">
          {config.label}
        </span>
      )}
      <div
        className={`font-bold ${config.type === 'textarea' ? 'text-odysseus-secondary leading-snug' : 'text-odysseus-dark'} text-xs`}
      >
        {displayValue()}
      </div>
    </div>
  );
};

/**
 * Section display renderer
 */
interface SectionDisplayProps {
  title: string;
  borderColor: string;
  headerColor: string;
  fields: Array<{
    config: FieldConfig;
    value: string | number | undefined;
    unitValue?: string;
  }>;
  researcherMap?: Map<string, Researcher>; // Pass through for foreign key resolution
  columns?: number; // Number of columns for grid layout (default: 1 for vertical stacking)
}

export const SectionDisplay: React.FC<SectionDisplayProps> = ({
  title,
  borderColor,
  headerColor,
  fields,
  researcherMap,
  columns = 1,
}) => {
  // Filter out empty fields
  const fieldsWithValues = fields.filter(
    ({ value }) => value !== undefined && value !== null && value !== ''
  );

  // Don't render section if no fields have values
  if (fieldsWithValues.length === 0) return null;

  // Map columns to grid class (explicit for Tailwind JIT)
  const gridColsClass =
    {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      6: 'grid-cols-6',
    }[columns] ?? 'grid-cols-1';

  const useGridLayout = columns > 1;

  return (
    <div className={`border-l-4 ${borderColor} pl-2.5 py-0.5`}>
      <div className={`font-bold ${headerColor} uppercase tracking-wider mb-0.5 text-xs`}>
        {title}
      </div>
      <div
        className={`${useGridLayout ? `grid ${gridColsClass} gap-x-3 gap-y-0.5` : 'flex flex-col'} pl-2`}
      >
        {fieldsWithValues.map(({ config, value, unitValue }, index) => {
          // Map gridSpan to col-span class (explicit for Tailwind JIT)
          const colSpanClass =
            config.gridSpan === 2
              ? 'col-span-2'
              : config.gridSpan === 3
                ? 'col-span-3'
                : config.gridSpan === 4
                  ? 'col-span-4'
                  : config.gridSpan === 5
                    ? 'col-span-5'
                    : config.gridSpan === 6
                      ? 'col-span-6'
                      : '';

          // For single-column layouts: control spacing individually
          // Compact fields get minimal spacing (1px), normal fields get standard spacing (2px)
          const spacingClass =
            !useGridLayout && index > 0 ? (config.compact ? 'mt-[1px]' : 'mt-0.5') : '';

          return (
            <div
              key={config.key}
              className={`${colSpanClass} ${config.indent ? 'pl-3' : ''} ${spacingClass}`}
            >
              <FieldDisplay
                config={config}
                value={value}
                unitValue={unitValue}
                researcherMap={researcherMap}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
