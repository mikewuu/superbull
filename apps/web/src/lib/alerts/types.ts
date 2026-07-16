export type AlertRuleType = 'failed_threshold' | 'stuck_queue' | 'worker_loss' | 'new_error_group';

export interface AlertRule {
  id: string;
  connectorId: string | null;
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
