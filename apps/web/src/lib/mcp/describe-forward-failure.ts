export function describeForwardFailure(result: { status: number; body: string }): string {
  try {
    const parsed = JSON.parse(result.body) as { error?: string };
    return parsed.error ?? `connector returned ${result.status}`;
  } catch {
    return `connector returned ${result.status}`;
  }
}
