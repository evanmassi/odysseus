/**
 * Demo Mode Banner
 *
 * Notice explaining a demo restriction; renders nothing outside a demo account.
 */

import { useIsDemo } from '@domains/authentication';
import { AlertBanner } from '@shared/ui/primitives/banners/AlertBanner';

import type { AlertBannerProps } from '@shared/ui/primitives/banners/types';

const ACCOUNT_SETTINGS_MESSAGE = 'Account changes are not available in demo mode';

interface DemoModeBannerProps {
  message?: string;
  spacing?: AlertBannerProps['spacing'];
}

export function DemoModeBanner({
  message = ACCOUNT_SETTINGS_MESSAGE,
  spacing = 'sm',
}: DemoModeBannerProps) {
  const isDemo = useIsDemo();
  if (!isDemo) return null;

  return (
    <AlertBanner variant="demo" spacing={spacing}>
      {message}
    </AlertBanner>
  );
}
