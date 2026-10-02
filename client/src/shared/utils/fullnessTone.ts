export type FullnessTone = 'success' | 'warning' | 'danger';

const WARNING_PERCENT = 70;
const DANGER_PERCENT = 90;

export function fullnessTone(percent: number): FullnessTone {
  if (percent >= DANGER_PERCENT) return 'danger';
  if (percent >= WARNING_PERCENT) return 'warning';
  return 'success';
}
