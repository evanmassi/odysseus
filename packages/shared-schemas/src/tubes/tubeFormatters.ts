/**
 * Display formatting utilities for tube data
 *
 * Presentation layer formatters applied only in UI components.
 * Business logic operates on raw data; these utilities handle display-only transformations.
 */

import type { TubeLocation, ConcentrationUnit } from './tubeSchemas';
import { positionToLabel } from '../storage/positionFormatters';
import type { PositionDisplayConfig } from '../storage/positionSchemas';

/**
 * Options for formatting tube location
 */
export interface TubeLocationFormatOptions {
  includePosition?: boolean;
  positionDisplayConfig?: PositionDisplayConfig;
  gridRows?: number;
  gridCols?: number;
}

/**
 * Format concentration for display in scientific notation (X.XEX format)
 * 
 * Examples:
 * - 5000000 → "5.0E+6"
 * - 5000000, 'c/v' → "5.0E+6 c/v"
 * - 1500000 → "1.5E+6"
 * - 320000000 → "3.2E+8"
 * - undefined → ""
 * - 0 → "0"
 * 
 * @param value - Raw concentration number (stored in domain)
 * @param unit - Optional concentration unit
 * @returns Formatted string for display
 */
export function formatConcentrationDisplay(
  value: number | undefined,
  unit?: ConcentrationUnit
): string {
  // Handle empty/missing values
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';
  
  // Convert to scientific notation: 5.0E+6
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  
  // Format: always show two decimal places to distinguish close values
  const mantissaFormatted = mantissa.toFixed(2);
  const exponentFormatted = exponent >= 0 ? `+${exponent}` : `${exponent}`;
  const scientificNotation = `${mantissaFormatted}E${exponentFormatted}`;
  
  // Append unit if provided
  return unit ? `${scientificNotation} ${unit}` : scientificNotation;
}

/**
 * Format tube location for display
 *
 * Examples:
 * - "Tank 1 / Rack A / Box 1 / Pos 42" (numeric)
 * - "Tank 1 / Rack A / Box 1 / Pos C5" (alphanumeric)
 *
 * @param location - Tube location object
 * @param options - Optional formatting options (position display config, grid dimensions)
 * @returns Formatted location string
 */
export function formatTubeLocation(
  location: TubeLocation,
  options: TubeLocationFormatOptions = {}
): string {
  const { includePosition = true, positionDisplayConfig, gridRows = 9, gridCols = 9 } = options;

  const base = `Tank ${location.tankId} / Rack ${location.rackId} / Box ${location.boxId}`;

  if (!includePosition) {
    return base;
  }

  // Use position display config if provided
  let positionLabel = location.position.toString();
  if (positionDisplayConfig) {
    try {
      positionLabel = positionToLabel(
        location.position,
        gridRows,
        gridCols,
        positionDisplayConfig
      );
    } catch {
      // Fall back to numeric if conversion fails
      positionLabel = location.position.toString();
    }
  }

  return `${base} / Pos ${positionLabel}`;
}

/**
 * Format tube location (short version for grid cells)
 * 
 * Example: "T1/RA/B1/P42"
 * 
 * @param location - Tube location object
 * @returns Compact location string
 */
export function formatTubeLocationShort(location: TubeLocation): string {
  return `T${location.tankId}/R${location.rackId}/B${location.boxId}/P${location.position}`;
}

/**
 * Format date for display (handles ISO strings and Date objects)
 * 
 * Example: "2024-01-15" → "Jan 15, 2024"
 * 
 * @param date - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatTubeDate(date: string | Date | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(date);
  }
}

/**
 * Parse concentration display string back to number (for editing)
 * 
 * This is for convenience when user wants to edit formatted value
 * NOT for validation (use schema preprocessor instead)
 * 
 * Examples:
 * - "5.0E+6" → 5000000
 * - "1.5E6" → 1500000
 * - "5000000" → 5000000
 * 
 * @param displayValue - Formatted concentration string
 * @returns Raw number or undefined if invalid
 */
export function parseConcentrationDisplay(displayValue: string): number | undefined {
  if (!displayValue || displayValue.trim() === '') return undefined;
  
  const trimmed = displayValue.trim().replace(/[,\s]/g, '');
  
  // Handle scientific notation
  const scientificRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
  const match = trimmed.match(scientificRegex);
  
  if (match) {
    const mantissa = parseFloat(match[1]);
    const exponent = parseInt(match[2]);
    return mantissa * Math.pow(10, exponent);
  }
  
  // Handle regular number
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}
