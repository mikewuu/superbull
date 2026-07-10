export function getUptimeBarColor(rate: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (rate === null) {
    return 'gray';
  }
  if (rate >= 0.99) {
    return 'green';
  }
  if (rate >= 0.95) {
    return 'amber';
  }
  return 'red';
}
