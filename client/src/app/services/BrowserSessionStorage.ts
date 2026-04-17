/**
 * Browser Session Storage
 *
 * Persists token state in localStorage. User data is persisted by the Zustand auth store;
 * activity tracking is in-memory on SessionService.
 */

import { logger } from '@infra/logger';

import type { TokenPair, SessionStorage } from '@shared/types/sessionTypes';

export class BrowserSessionStorage implements SessionStorage {
  private readonly TOKENS_KEY = 'odysseus-tokens';

  getTokens(): TokenPair | null {
    try {
      const stored = localStorage.getItem(this.TOKENS_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      const accessTokenExpiry = new Date(parsed.accessTokenExpiry);
      const refreshTokenExpiry = new Date(parsed.refreshTokenExpiry);

      // Guard against "Invalid Date" crashing downstream consumers
      if (isNaN(accessTokenExpiry.getTime()) || isNaN(refreshTokenExpiry.getTime())) {
        logger.warn('Invalid token expiry dates in storage, clearing tokens');
        this.clearTokens();
        return null;
      }

      return {
        ...parsed,
        accessTokenExpiry,
        refreshTokenExpiry,
      };
    } catch (error) {
      logger.error('Failed to parse stored tokens', { error });
      return null;
    }
  }

  setTokens(tokens: TokenPair): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
  }

  clearTokens(): void {
    localStorage.removeItem(this.TOKENS_KEY);
  }
}
