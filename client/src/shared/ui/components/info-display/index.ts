/**
 * Info Display Components
 */

// DemoModeBanner is deliberately absent: it reads the auth store, so exporting it here would
// make @shared/ui pull in @domains/authentication, which imports @shared/ui back. Its three
// consumers import it by path instead.

export { AccentTick } from './AccentTick';
export type { AccentTickTone } from './AccentTick';
export { CompletenessMeter } from './CompletenessMeter';
export { DemoLockIndicator } from './DemoLockIndicator';
export { DetailRow } from './DetailRow';
export { InfoPanelEmpty } from './InfoPanelEmpty';
export { OccupancyBar } from './OccupancyBar';
export { StripLabel } from './StripLabel';
