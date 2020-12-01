export function dist(mean: number, moe: number) {
  return mean + moe * Math.random() * (Math.random() > 0.5 ? 1 : -1);
}

export function clamp(val: number, low: number, high: number) {
  return Math.max(low, Math.min(high, val));
}
