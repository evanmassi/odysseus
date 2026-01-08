/**
 * Experimental Browser API Types
 *
 * Type definitions for experimental/draft browser APIs that are not yet included
 * in TypeScript's lib.dom.d.ts due to limited browser support.
 *
 * These APIs are subject to change and may not be available in all browsers.
 * Always check for feature availability before using.
 */

/**
 * Network Information API
 *
 * Provides information about the system's connection type and quality.
 *
 * Browser Support (as of 2025):
 * - Chrome/Edge: Full support (experimental)
 * - Firefox: No support
 * - Safari: No support
 *
 * Specification: https://wicg.github.io/netinfo/
 * MDN: https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 *
 * Note: These types were removed from TypeScript's lib.dom in version 4.8
 * because the API doesn't meet the requirement of being supported by 2+ major
 * browser engines (Gecko, Blink, WebKit).
 */
export interface NetworkInformation extends EventTarget {
  /**
   * Effective bandwidth estimate in megabits per second (Mbps)
   * Rounded to nearest multiple of 25 kbps
   */
  readonly downlink?: number;

  /**
   * Effective connection type determined using recently observed RTT and downlink values
   * - 'slow-2g': RTT >= 2000ms, downlink < 50 kbps
   * - '2g': RTT >= 1400ms, downlink < 70 kbps
   * - '3g': RTT >= 270ms, downlink < 700 kbps
   * - '4g': RTT < 270ms, downlink >= 700 kbps
   */
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';

  /**
   * Estimated effective round-trip time (RTT) in milliseconds
   * Rounded to nearest multiple of 25ms
   */
  readonly rtt?: number;

  /**
   * Whether user has requested reduced data usage mode
   */
  readonly saveData?: boolean;

  /**
   * Underlying connection technology (when available)
   * Note: Most browsers don't expose this for privacy reasons
   */
  readonly type?:
    | 'bluetooth'
    | 'cellular'
    | 'ethernet'
    | 'none'
    | 'wifi'
    | 'wimax'
    | 'other'
    | 'unknown';
}

/**
 * Navigator interface extended with Network Information API
 *
 * Adds connection property to Navigator, with vendor prefixes for compatibility.
 * Use feature detection before accessing these properties.
 *
 * @example
 * ```typescript
 * const nav = navigator as NavigatorWithConnection;
 * const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
 *
 * if (connection) {
 *   console.log('Downlink:', connection.downlink);
 *   console.log('Effective Type:', connection.effectiveType);
 *   console.log('RTT:', connection.rtt);
 * }
 * ```
 */
export interface NavigatorWithConnection extends Navigator {
  /**
   * NetworkInformation object (standard)
   * Available in Chrome/Edge (experimental)
   */
  readonly connection?: NetworkInformation;

  /**
   * NetworkInformation object (Mozilla prefix)
   * Currently not implemented in Firefox
   */
  readonly mozConnection?: NetworkInformation;

  /**
   * NetworkInformation object (WebKit prefix)
   * Currently not implemented in Safari
   */
  readonly webkitConnection?: NetworkInformation;
}
