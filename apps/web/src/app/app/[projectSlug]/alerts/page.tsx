import { EmptyState, PageHeader } from '@superbull/ui';
import { Bell } from 'lucide-react';
import { listAlertRules } from '../../../../lib/alerts/list-alert-rules';
import { listAlertStates } from '../../../../lib/alerts/list-alert-states';
import type { AlertRule, AlertState } from '../../../../lib/alerts/types';
import { listConnectors } from '../../../../lib/connectors/list-connectors';
import type { Connector } from '../../../../lib/connectors/types';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { type AlertRuleRow, AlertRulesTable } from './_components/alert-rules-table';
import { NewRuleDialog } from './_components/new-rule-dialog';

export const dynamic = 'force-dynamic';

interface AlertsPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function AlertsPage(props: AlertsPageProps) {
  const { projectSlug } = await props.params;
  const { project } = await requireProjectForSlug(projectSlug);

  const [rules, states, connectors] = await Promise.all([
    listAlertRules(project._id),
    listAlertStates(project._id),
    listConnectors(project._id),
  ]);
  const rows = getAlertRuleRows(rules, states, connectors);

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Rules that watch ingested queue activity and email you when something breaks."
        controls={
          <NewRuleDialog
            projectSlug={projectSlug}
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
          <AlertRulesTable projectSlug={projectSlug} rows={rows} />
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
