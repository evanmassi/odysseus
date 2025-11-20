/**
 * Format resource display name with optional custom label
 *
 * @param genericName - The generic resource name (e.g., "Rack 3", "Box B")
 * @param customLabel - Optional custom label added by the user
 * @returns Formatted display name
 *
 * @example
 * formatResourceDisplayName("Rack 3", undefined) → "Rack 3"
 * formatResourceDisplayName("Rack 3", "Hadia's Samples") → "Rack 3 (Hadia's Samples)"
 * formatResourceDisplayName("Box B", "T cell donors") → "Box B (T cell donors)"
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
