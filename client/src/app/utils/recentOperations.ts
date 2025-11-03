/**
 * Simple time-based deduplication system for local operations
 * Tracks recent local operations to avoid processing duplicate socket events
 */

class RecentOperations {
  private recentCreates = new Set<string>();
  private recentUpdates = new Set<string>();
  private recentDeletes = new Set<string>();
  private readonly OPERATION_TIMEOUT = 1000; // 1 second

  /**
   * Track a recent create operation
   */
  trackCreate(tubeId: string): void {
    this.recentCreates.add(tubeId);
    setTimeout(() => this.recentCreates.delete(tubeId), this.OPERATION_TIMEOUT);
  }

  /**
   * Track a recent update operation
   */
  trackUpdate(tubeId: string): void {
    this.recentUpdates.add(tubeId);
    setTimeout(() => this.recentUpdates.delete(tubeId), this.OPERATION_TIMEOUT);
  }

  /**
   * Track a recent delete operation
   */
  trackDelete(tubeId: string): void {
    this.recentDeletes.add(tubeId);
    setTimeout(() => this.recentDeletes.delete(tubeId), this.OPERATION_TIMEOUT);
  }

  /**
   * Check if we should ignore a socket event for a recent local operation
   */
  shouldIgnoreCreate(tubeId: string): boolean {
    return this.recentCreates.has(tubeId);
  }

  shouldIgnoreUpdate(tubeId: string): boolean {
    return this.recentUpdates.has(tubeId);
  }

  shouldIgnoreDelete(tubeId: string): boolean {
    return this.recentDeletes.has(tubeId);
  }
}

// Export singleton instance
export const recentOperations = new RecentOperations();
