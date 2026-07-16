import { EmptyState, PageHeader } from '@superbull/ui';
import { Bell } from 'lucide-react';
import { listAlertRules } from '../../../../lib/alerts/list-alert-rules';
import { listAlertStates } from '../../../../lib/alerts/list-alert-states';
import type { AlertRule, AlertState } from '../../../../lib/alerts/types';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../lib/connectors/types';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';
import { type AlertRuleRow, AlertRulesTable } from './_components/alert-rules-table';
import { NewRuleDialog } from './_components/new-rule-dialog';

export const dynamic = 'force-dynamic';

interface AlertsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AlertsPage(props: AlertsPageProps) {
  const { workspaceSlug } = await props.params;
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);

  const [rules, states, connectors] = await Promise.all([
    listAlertRules(workspace._id),
    listAlertStates(workspace._id),
    listConnectors(workspace._id),
  ]);
  const rows = getAlertRuleRows(rules, states, connectors);

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Rules that watch ingested queue activity and email you when something breaks."
        controls={
          <NewRuleDialog
            workspaceSlug={workspaceSlug}
            connectors={connectors.map((connector) => ({ id: connector.id, name: connector.name }))}
          />
        }
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-5 text-content-muted" />}
            title="No alert rules yet"
            description="Create a rule to get emailed when a queue backs up, workers disappear, or new errors start."
          />
        ) : (
          <AlertRulesTable workspaceSlug={workspaceSlug} rows={rows} />
        )}
      </div>
    </>
  );
}

function getAlertRuleRows(
  rules: AlertRule[],
  states: AlertState[],
  connectors: Connector[],
): AlertRuleRow[] {
  const stateByRuleId = new Map(states.map((state) => [state.ruleId, state]));
  const connectorNameById = new Map(connectors.map((connector) => [connector.id, connector.name]));

  return rules.map((rule) => ({
    rule,
    connectorName: rule.connectorId
      ? (connectorNameById.get(rule.connectorId) ?? 'Unknown connector')
      : 'All connectors',
    state: stateByRuleId.get(rule.id)?.state ?? null,
  }));
}
