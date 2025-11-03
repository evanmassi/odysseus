/**
 * Format Position Ranges Utility
 * 
 * Industry-standard utility for displaying position lists in human-readable format
 * Converts: [1, 2, 3, 4, 5, 10, 11, 12, 27] → "1-5, 10-12, 27"
 */

/**
 * Format an array of position numbers into consecutive ranges
 * @param positions - Array of position numbers
 * @returns Formatted string with ranges (e.g., "1-5, 10-12, 27")
 */
export const formatPositionRanges = (positions: number[]): string => {
  if (positions.length === 0) return '';
  if (positions.length === 1) return String(positions[0]);

  // Sort positions in ascending order
  const sorted = [...positions].sort((a, b) => a - b);
  
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    if (current === previous + 1) {
      // Consecutive - extend current range
      rangeEnd = current;
    } else {
      // Non-consecutive - output previous range and start new one
      if (rangeStart === rangeEnd) {
        ranges.push(String(rangeStart));
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      rangeStart = current;
      rangeEnd = current;
    }
  }

  // Output final range
  if (rangeStart === rangeEnd) {
    ranges.push(String(rangeStart));
  } else {
    ranges.push(`${rangeStart}-${rangeEnd}`);
  }

  return ranges.join(', ');
};
