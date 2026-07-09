import { describe, expect, it } from 'vitest';
import type { AppJob } from '../src/lib/api-types';
import { getJobStatus } from '../src/lib/get-job-status';

function makeJob(overrides: Partial<AppJob>): AppJob {
  return {
    id: '1',
    name: 'job',
    timestamp: 0,
    progress: 0,
    attempts: 0,
    failed_reason: '',
    stacktrace: [],
    delay: undefined,
    opts: {},
    data: {},
    return_value: null,
    is_failed: false,
    ...overrides,
  };
}

describe('getJobStatus', () => {
  it('returns the selected status verbatim when not "latest"', () => {
    expect(getJobStatus(makeJob({}), 'delayed')).toBe('delayed');
    expect(getJobStatus(makeJob({ is_failed: true, finished_on: 1 }), 'completed')).toBe(
      'completed',
    );
  });

  it('derives failed when the job finished and is marked failed', () => {
    expect(getJobStatus(makeJob({ is_failed: true, finished_on: 100 }), 'latest')).toBe('failed');
  });

  it('derives completed when finished without failure', () => {
    expect(getJobStatus(makeJob({ finished_on: 100 }), 'latest')).toBe('completed');
  });

  it('derives active when processed but not finished', () => {
    expect(getJobStatus(makeJob({ processed_on: 100 }), 'latest')).toBe('active');
  });

  it('derives delayed when a positive delay is set', () => {
    expect(getJobStatus(makeJob({ delay: 5000 }), 'latest')).toBe('delayed');
  });

  it('falls back to waiting', () => {
    expect(getJobStatus(makeJob({}), 'latest')).toBe('waiting');
  });
});
