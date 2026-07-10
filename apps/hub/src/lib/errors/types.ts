export type ErrorGroupState = 'open' | 'resolved' | 'ignored';

export interface ErrorGroup {
  id: string;
  sourceId: string;
  fingerprint: string;
  queueName: string;
  jobName?: string;
  message: string;
  state: ErrorGroupState;
  count: number;
  firstSeenTs: number;
  lastSeenTs: number;
  lastJobId?: string;
  isRegression: boolean;
}
