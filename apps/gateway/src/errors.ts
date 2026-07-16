export class ConnectorDisconnectedError extends Error {
  constructor() {
    super('connector disconnected');
    this.name = 'ConnectorDisconnectedError';
  }
}

export class RpcTimeoutError extends Error {
  constructor() {
    super('connector timeout');
    this.name = 'RpcTimeoutError';
  }
}
