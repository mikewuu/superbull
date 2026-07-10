import { describe, expect, it } from 'vitest';
import { validateBulkJobs } from '../src/lib/validate-bulk-jobs';

describe('validateBulkJobs', () => {
  it('parses a valid array of job drafts', () => {
    const result = validateBulkJobs(
      JSON.stringify([
        { name: 'welcome-email', data: { to: 'a@example.com' } },
        { name: 'invoice-receipt', data: {}, opts: { priority: 2 } },
      ]),
    );
    expect('jobs' in result && result.jobs).toEqual([
      { name: 'welcome-email', data: { to: 'a@example.com' }, opts: undefined },
      { name: 'invoice-receipt', data: {}, opts: { priority: 2 } },
    ]);
  });

  it('rejects invalid JSON', () => {
    const result = validateBulkJobs('not json');
    expect('error' in result && result.error).toMatch(/valid JSON/);
  });

  it('rejects a non-array payload', () => {
    const result = validateBulkJobs(JSON.stringify({ name: 'welcome-email' }));
    expect('error' in result && result.error).toMatch(/JSON array/);
  });

  it('rejects an empty array', () => {
    const result = validateBulkJobs('[]');
    expect('error' in result && result.error).toMatch(/JSON array/);
  });

  it('rejects an item missing a name, reporting the offending index', () => {
    const result = validateBulkJobs(JSON.stringify([{ name: 'ok' }, { data: {} }]));
    expect('error' in result && result.error).toMatch(/index 1/);
  });

  it('rejects an item with invalid opts', () => {
    const result = validateBulkJobs(JSON.stringify([{ name: 'ok', opts: 'nope' }]));
    expect('error' in result && result.error).toMatch(/invalid "opts"/);
  });
});
