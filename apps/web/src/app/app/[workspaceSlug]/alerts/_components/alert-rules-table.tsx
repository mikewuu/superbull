import { StatusBadge } from '@superbull/ui';
import type { AlertRule } from '../../../../../lib/alerts/types';
import { DeleteRuleButton } from './delete-rule-button';
import { EnableRuleToggle } from './enable-rule-toggle';

export interface AlertRuleRow {
  rule: AlertRule;
  connectorName: string;
  state: 'firing' | 'resolved' | null;
}

interface AlertRulesTableProps {
  workspaceSlug: string;
  rows: AlertRuleRow[];
}

export function AlertRulesTable(props: AlertRulesTableProps) {
  const { workspaceSlug, rows } = props;

  return (
    <div className="candy-card overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-2sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-muted/60 text-left text-xs text-content-subtle">
            <th className="px-5 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Target</th>
            <th className="px-4 py-2.5 font-medium">Condition</th>
            <th className="px-4 py-2.5 font-medium">Email</th>
            <th className="w-20 px-4 py-2.5 font-medium">State</th>
            <th className="w-20 px-4 py-2.5 font-medium">Enabled</th>
            <th className="w-16 px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rule.id}
              data-testid="alert-rule-row"
              className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-bg-muted"
            >
              <td className="px-5 py-3 font-medium text-content-emphasis">
                {alertTypeLabel(row.rule.type)}
              </td>
              <td className="px-4 py-3 text-content-subtle">
                {row.connectorName}
                {row.rule.queueName && (
                  <span className="text-content-muted"> / {row.rule.queueName}</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-content-subtle">
                {row.rule.type === 'failed_threshold'
                  ? `>=${row.rule.threshold} in ${row.rule.windowMinutes}m`
                  : `${row.rule.windowMinutes}m window`}
              </td>
              <td className="px-4 py-3 text-content-subtle">{row.rule.email}</td>
              <td className="px-4 py-3" data-testid="alert-rule-state">
                {row.state === 'firing' ? (
                  <StatusBadge variant="error">firing</StatusBadge>
                ) : (
                  <StatusBadge variant="success">ok</StatusBadge>
                )}
              </td>
              <td className="px-4 py-3">
                <EnableRuleToggle
                  workspaceSlug={workspaceSlug}
                  ruleId={row.rule.id}
                  isEnabled={row.rule.isEnabled}
                />
              </td>
              <td className="px-5 py-3 text-right">
                <DeleteRuleButton
                  workspaceSlug={workspaceSlug}
                  ruleId={row.rule.id}
                  ruleLabel={alertTypeLabel(row.rule.type)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function alertTypeLabel(type: AlertRule['type']): string {
  if (type === 'failed_threshold') {
    return 'Failed threshold';
  }
  if (type === 'stuck_queue') {
    return 'Stuck queue';
  }
  if (type === 'worker_loss') {
    return 'Worker loss';
  }
  return 'New error group';
}
