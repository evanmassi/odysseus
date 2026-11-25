const FRESH_FLASH_MS = 1500;

const FRESH_FLASH: Keyframe[] = [
  {
    backgroundColor: 'hsl(var(--primary) / 0.3)',
    boxShadow: '0 0 14px hsl(var(--primary) / 0.45)',
  },
  { backgroundColor: 'transparent', boxShadow: 'none' },
];

export function flashFresh(element: Element | null | undefined): void {
  element?.animate(FRESH_FLASH, { duration: FRESH_FLASH_MS, easing: 'ease-out' });
}
