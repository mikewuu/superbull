export interface BulkJobDraft {
  name: string;
  data: unknown;
  opts?: { delay?: number; attempts?: number; priority?: number };
}

export function validateBulkJobs(text: string): { jobs: BulkJobDraft[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'Bulk data must be valid JSON.' };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: 'Bulk data must be a non-empty JSON array of jobs.' };
  }

  const jobs: BulkJobDraft[] = [];
  for (const [index, item] of parsed.entries()) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { error: `Job at index ${index} must be an object.` };
    }
    const { name, data, opts } = item as Record<string, unknown>;
    if (typeof name !== 'string' || name.trim() === '') {
      return { error: `Job at index ${index} is missing a "name".` };
    }
    if (opts !== undefined && !isJobOpts(opts)) {
      return { error: `Job at index ${index} has an invalid "opts".` };
    }
    jobs.push({ name, data, opts });
  }
  return { jobs };
}

function isJobOpts(opts: unknown): opts is NonNullable<BulkJobDraft['opts']> {
  if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
    return false;
  }
  const record = opts as Record<string, unknown>;
  return ['delay', 'attempts', 'priority'].every(
    (field) => record[field] === undefined || typeof record[field] === 'number',
  );
}
