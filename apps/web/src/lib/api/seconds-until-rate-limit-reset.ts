export function secondsUntilRateLimitReset(): number {
  return 60 - Math.floor((Date.now() % 60_000) / 1000);
}
