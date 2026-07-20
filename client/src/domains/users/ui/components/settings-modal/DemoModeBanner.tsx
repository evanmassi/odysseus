/**
 * Demo Mode Banner
 *
 * Notice shown in account settings when the user is on a read-only demo account.
 */

import { useIsDemo } from '@domains/authentication';
import { AlertBanner } from '@shared/ui';

export function DemoModeBanner() {
  const isDemo = useIsDemo();
  if (!isDemo) return null;

  return (
    <AlertBanner variant="demo" spacing="sm">
      Account changes are not available in demo mode
    </AlertBanner>
  );
}
