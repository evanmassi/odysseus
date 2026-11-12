const HUE_STOPS: ReadonlyArray<readonly [number, number]> = [
  [380, 272],
  [420, 262],
  [460, 228],
  [490, 196],
  [520, 130],
  [560, 72],
  [590, 40],
  [630, 8],
  [700, 0],
];
const UV_EDGE = 380;
const NEAR_IR_EDGE = 700;
const FARTHEST_NM = 850;

function hueAt(nm: number): number {
  const upper = HUE_STOPS.findIndex(([stop]) => stop >= nm);
  if (upper <= 0) return HUE_STOPS[upper < 0 ? HUE_STOPS.length - 1 : 0][1];
  const [fromNm, fromHue] = HUE_STOPS[upper - 1];
  const [toNm, toHue] = HUE_STOPS[upper];
  return fromHue + ((nm - fromNm) / (toNm - fromNm)) * (toHue - fromHue);
}

export function wavelengthColor(nm: number): string {
  if (nm < UV_EDGE) return 'hsl(268 40% 74%)';
  const pastVisible = Math.min(1, Math.max(0, (nm - NEAR_IR_EDGE) / (FARTHEST_NM - NEAR_IR_EDGE)));
  const lightness = 62 - pastVisible * 30;
  return `hsl(${Math.round(hueAt(nm))} 72% ${Math.round(lightness)}%)`;
}

export const filterCenter = (filter: string): number => Number.parseFloat(filter);
