/**
 * Grid Clipboard Utilities
 * OS clipboard integration with safe fallback patterns for laboratory tube management
 */

import type { ClipboardData } from '@shared/types/clipboard';

const CLIPBOARD_MARKER = 'OdysseusGrid/Tubes@v1';

/**
 * Serialize clipboard data for OS clipboard storage
 */
export const serializeClipboard = (clipboard: ClipboardData): string => {
  return JSON.stringify({ 
    __type: CLIPBOARD_MARKER, 
    data: clipboard 
  });
};

/**
 * Parse clipboard text and extract structured data
 */
export const tryParseClipboard = (text: string): ClipboardData | null => {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.__type === CLIPBOARD_MARKER && parsed?.data) {
      return parsed.data as ClipboardData;
    }
  } catch {
    // Ignore parse errors - not our format
  }
  return null;
};

/**
 * Write clipboard data to OS clipboard (with graceful fallback)
 */
export const writeClipboardOS = async (clipboard: ClipboardData): Promise<void> => {
  const text = serializeClipboard(clipboard);
  
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore OS clipboard errors - we have in-app clipboard as fallback
    }
  }
};

/**
 * Read clipboard data from OS clipboard (with graceful fallback)
 */
export const readClipboardOS = async (): Promise<ClipboardData | null> => {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      return tryParseClipboard(text);
    } catch {
      // Ignore read errors - may require user gesture
    }
  }
  return null;
};
