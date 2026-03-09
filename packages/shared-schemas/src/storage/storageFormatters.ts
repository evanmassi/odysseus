/**
 * Storage Display Formatters
 *
 * Display name utilities for storage resources (tanks, racks, boxes).
 */

/**
 * @example
 * formatResourceDisplayName("Rack 3", undefined) → "Rack 3"
 * formatResourceDisplayName("Rack 3", "Hadia's Samples") → "Rack 3 (Hadia's Samples)"
 */
export const formatResourceDisplayName = (
  genericName: string,
  customLabel?: string
): string => {
  if (!customLabel || customLabel.trim().length === 0) {
    return genericName;
  }
  return `${genericName} (${customLabel})`;
};
