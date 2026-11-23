export type Point = readonly [x: number, y: number];

const HEAD_LENGTH = 15;
const HEAD_WIDTH = 19;
const TAIL_WIDTH = 1.5;
const NECK_WIDTH = 8;
const WIDENING = 1.6;
const SAMPLES = 40;
const BEND_AT = 0.72;
const HEAD_SEARCH_STEP = 0.005;

export function dilutionArrowPoints(from: Point, to: Point, arcTop: number): Point[] {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const bendX = x0 + (x1 - x0) * BEND_AT;
  const bendY = 2 * arcTop - (y0 + y1) / 2;
  const at = (t: number): Point => [
    (1 - t) ** 2 * x0 + 2 * (1 - t) * t * bendX + t * t * x1,
    (1 - t) ** 2 * y0 + 2 * (1 - t) * t * bendY + t * t * y1,
  ];
  const direction = (t: number): Point => {
    const dx = 2 * (1 - t) * (bendX - x0) + 2 * t * (x1 - bendX);
    const dy = 2 * (1 - t) * (bendY - y0) + 2 * t * (y1 - bendY);
    const length = Math.hypot(dx, dy);
    return [dx / length, dy / length];
  };
  let neckAt = 1;
  while (neckAt > 0 && Math.hypot(at(neckAt)[0] - x1, at(neckAt)[1] - y1) < HEAD_LENGTH) {
    neckAt -= HEAD_SEARCH_STEP;
  }
  const left: Point[] = [];
  const right: Point[] = [];
  for (let sample = 0; sample <= SAMPLES; sample++) {
    const share = sample / SAMPLES;
    const [px, py] = at(neckAt * share);
    const [tx, ty] = direction(neckAt * share);
    const half = (TAIL_WIDTH + (NECK_WIDTH - TAIL_WIDTH) * share ** WIDENING) / 2;
    left.push([px - ty * half, py + tx * half]);
    right.unshift([px + ty * half, py - tx * half]);
  }
  const [nx, ny] = at(neckAt);
  const [tx, ty] = direction(neckAt);
  const half = HEAD_WIDTH / 2;
  return [
    ...left,
    [nx - ty * half, ny + tx * half],
    to,
    [nx + ty * half, ny - tx * half],
    ...right,
  ];
}
