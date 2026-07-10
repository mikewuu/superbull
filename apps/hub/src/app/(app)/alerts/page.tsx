import { EmptyState, PageHeader } from '@superbull/ui';
import { Bell } from 'lucide-react';
import { listAlertRules } from '../../../lib/alerts/list-alert-rules';
import { listAlertStates } from '../../../lib/alerts/list-alert-states';
import type { AlertRule, AlertState } from '../../../lib/alerts/types';
import { listSources } from '../../../lib/sources/list-sources';
import type { ProxySource } from '../../../lib/sources/types';
import { type AlertRuleRow, AlertRulesTable } from './_components/alert-rules-table';
import { NewRuleDialog } from './_components/new-rule-dialog';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const [rules, states, sources] = await Promise.all([
    listAlertRules(),
    listAlertStates(),
    listSources(),
  ]);
  const rows = getAlertRuleRows(rules, states, sources);

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Rules that watch ingested queue activity and email you when something breaks."
        controls={
          <NewRuleDialog
            sources={sources.map((source) => ({ id: source.id, name: source.name }))}
          />
        }
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alert rules yet"
            description="Create a rule to get emailed when a queue backs up, workers disappear, or new errors start."
          />
        ) : (
          <AlertRulesTable rows={rows} />
        )}
      </div>
    </>
  );
}

function getAlertRuleRows(
  rules: AlertRule[],
  states: AlertState[],
  sources: ProxySource[],
): AlertRuleRow[] {
  const stateByRuleId = new Map(states.map((state) => [state.ruleId, state]));
  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));

  return rules.map((rule) => ({
    rule,
    sourceName: rule.sourceId
      ? (sourceNameById.get(rule.sourceId) ?? 'Unknown source')
      : 'All sources',
    state: stateByRuleId.get(rule.id)?.state ?? null,
  }));
}
