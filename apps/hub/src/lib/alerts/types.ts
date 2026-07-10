export type AlertRuleType = 'failed_threshold' | 'stuck_queue' | 'worker_loss' | 'new_error_group';

export interface AlertRule {
  id: string;
  sourceId: string | null;
  type: AlertRuleType;
  queueName: string | null;
  threshold: number | null;
  windowMinutes: number | null;
  email: string;
  isEnabled: boolean;
}

export interface AlertState {
  ruleId: string;
  state: 'firing' | 'resolved';
  lastFiredTs: number | null;
  lastNotifiedTs: number | null;
}

export interface AlertNotification {
  ruleId: string;
  email: string;
  type: AlertRuleType;
  queueName: string | null;
  summary: string;
  kind: 'firing' | 'resolved';
}
