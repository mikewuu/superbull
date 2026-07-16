export type DashboardCardType = 'throughput' | 'latency' | 'totals' | 'heatmap';
export type DashboardRange = '24h' | '7d' | '30d';

export interface DashboardCard {
  type: DashboardCardType;
  connector_id: string;
  queue_name?: string;
  range: DashboardRange;
}

export interface SavedDashboard {
  id: string;
  name: string;
  cards: DashboardCard[];
  created_at: Date;
}
