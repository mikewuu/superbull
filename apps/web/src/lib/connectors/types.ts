export interface Connector {
  id: string;
  workspaceId: string;
  name: string;
  version: string | null;
  queues: string[] | null;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  created_at: Date;
}
