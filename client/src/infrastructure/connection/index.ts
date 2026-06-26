/**
 * Network Connection Infrastructure
 *
 * The server-reachability monitor, the shared offline flag, and the useNetworkStatus hook.
 */

export {
  initializeNetworkMonitor,
  getNetworkMonitor,
  cleanupNetworkMonitor,
} from './NetworkMonitor';

export { isOffline, resetNetworkState } from './networkState';

export { useNetworkStatus } from './useNetworkStatus';
