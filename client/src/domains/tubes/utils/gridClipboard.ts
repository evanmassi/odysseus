/**
 * Grid Clipboard Utilities
 *
 * OS clipboard integration with safe fallback patterns for tube grid management.
 */

import type { ClipboardData } from '@domains/tubes/types/clipboardTypes';

const CLIPBOARD_MARKER = 'OdysseusGrid/Tubes@v1';

const serializeClipboard = (clipboard: ClipboardData): string => {
  return JSON.stringify({
    __type: CLIPBOARD_MARKER,
    data: clipboard,
  });
};

const tryParseClipboard = (text: string): ClipboardData | null => {
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
