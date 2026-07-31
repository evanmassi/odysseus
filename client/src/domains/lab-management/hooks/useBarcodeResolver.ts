/**
 * Barcode Resolver
 *
 * Resolves a scanned value across catalogs for the scan inputs, owning the in-flight flag and
 * the failure toast so each caller only decides what to do with the outcome. A failed lookup is
 * distinct from an unknown value — the caller must not offer to link a barcode it never read.
 */

import { useCallback, useState } from 'react';

import { notifications } from '@shared/utils/notifications';

import { BarcodeService } from '../services/BarcodeService';

import type { BarcodeMatch } from '@odysseus/shared-schemas';

type BarcodeScanResult =
  | { status: 'match'; match: BarcodeMatch }
  | { status: 'unknown' }
  | { status: 'failed' };

export function useBarcodeResolver() {
  const [isResolving, setIsResolving] = useState(false);

  const resolve = useCallback(async (value: string): Promise<BarcodeScanResult> => {
    setIsResolving(true);
    try {
      const match = await BarcodeService.resolve(value);
      return match ? { status: 'match', match } : { status: 'unknown' };
    } catch {
      notifications.error('Failed to resolve barcode');
      return { status: 'failed' };
    } finally {
      setIsResolving(false);
    }
  }, []);

  return { resolve, isResolving };
}
