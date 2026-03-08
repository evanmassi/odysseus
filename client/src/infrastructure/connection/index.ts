/**
 * Network Connection Infrastructure
 */

export {
  NetworkMonitor,
  initializeNetworkMonitor,
  getNetworkMonitor,
  cleanupNetworkMonitor,
} from './NetworkMonitor';
export type { NetworkStatus, NetworkEvent } from './NetworkMonitor';

export { isOffline, setOffline, resetNetworkState } from './networkState';

export { useNetworkStatus } from './useNetworkStatus';
