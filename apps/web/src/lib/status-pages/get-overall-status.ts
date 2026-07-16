export function getOverallStatus(rate: number | null): 'operational' | 'degraded' | 'issues' {
  if (rate === null) {
    return 'operational';
  }
  if (rate === 1) {
    return 'operational';
  }
  if (rate >= 0.99) {
    return 'operational';
  }
  if (rate < 0.95) {
    return 'issues';
  }
  return 'degraded';
}
