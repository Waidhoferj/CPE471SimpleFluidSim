export function clamp(val: number, low: number, high: number) {
  return Math.max(low, Math.min(high, val));
}

export function dist(x1: number, x2: number, y1: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export function dir(x1: number, x2: number, y1: number, y2: number) {
  return Math.atan2(y2 - y1, x2 - x1);
}
