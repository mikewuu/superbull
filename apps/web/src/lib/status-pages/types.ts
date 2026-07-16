export interface StatusPageConfig {
  id: string;
  connectorId: string;
  slug: string;
  isEnabled: boolean;
  title: string;
  logoStorageId: string | null;
  queueNames: string[];
}

export interface PublicStatusPage {
  title: string;
  logo_url: string | null;
  queues: string[];
}

export interface UptimeDay {
  date: string;
  rate: number | null;
  total: number;
}

export interface PublicStatusPageQueueUptime {
  name: string;
  rate_90d: number | null;
  days: UptimeDay[];
}

export interface PublicStatusPageUptime {
  overall_rate_90d: number | null;
  overall: UptimeDay[];
  queues: PublicStatusPageQueueUptime[];
}
