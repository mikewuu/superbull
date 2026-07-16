import type { RpcResponse } from '@superbull/protocol';
import type { WebSocket } from 'ws';

export interface PendingRpc {
  resolve: (response: RpcResponse) => void;
  reject: (error: Error) => void;
}

export interface ConnectorSession {
  connectorId: string;
  workspaceId: string;
  name: string;
  version: string;
  queues: string[];
  ws: WebSocket;
  connectedAt: number;
  pendingRpc: Map<string, PendingRpc>;
}

export class SessionRegistry {
  private sessions = new Map<string, ConnectorSession>();

  get(connectorId: string): ConnectorSession | undefined {
    return this.sessions.get(connectorId);
  }

  set(session: ConnectorSession): ConnectorSession | undefined {
    const previous = this.sessions.get(session.connectorId);
    this.sessions.set(session.connectorId, session);
    return previous;
  }

  deleteIfCurrent(session: ConnectorSession): boolean {
    if (this.sessions.get(session.connectorId) !== session) {
      return false;
    }
    this.sessions.delete(session.connectorId);
    return true;
  }
}

export function rejectAllPendingRpc(session: ConnectorSession, error: Error): void {
  for (const pending of session.pendingRpc.values()) {
    pending.reject(error);
  }
  session.pendingRpc.clear();
}
