export const jobStatuses = [
  'active',
  'waiting',
  'waiting-children',
  'prioritized',
  'completed',
  'failed',
  'delayed',
  'paused',
] as const;

export type JobStatus = (typeof jobStatuses)[number];
