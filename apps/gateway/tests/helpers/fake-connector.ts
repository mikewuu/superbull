import {
  type ConnectorFrame,
  type GatewayFrame,
  type HelloFrame,
  type RequestFrame,
  parseGatewayFrame,
} from '@superbull/protocol';
import { WebSocket } from 'ws';

export function connectFakeConnector(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

export async function connectAndHandshake(url: string, hello: HelloFrame): Promise<WebSocket> {
  const ws = await connectFakeConnector(url);
  sendConnectorFrame(ws, hello);
  const ack = await nextGatewayFrame(ws);
  if (ack.type !== 'hello_ack') {
    throw new Error(`expected hello_ack, got ${ack.type}`);
  }
  return ws;
}

export function sendConnectorFrame(ws: WebSocket, frame: ConnectorFrame): void {
  ws.send(JSON.stringify(frame));
}

export function nextGatewayFrame(ws: WebSocket): Promise<GatewayFrame> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      ws.off('message', onMessage);
      ws.off('close', onClose);
    };
    const onMessage = (raw: Buffer) => {
      cleanup();
      const frame = parseGatewayFrame(raw.toString());
      if (!frame) {
        reject(new Error(`received invalid gateway frame: ${raw.toString()}`));
        return;
      }
      resolve(frame);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('socket closed before a gateway frame arrived'));
    };
    ws.once('message', onMessage);
    ws.once('close', onClose);
  });
}

export function nextClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once('close', (code: number, reason: Buffer) => {
      resolve({ code, reason: reason.toString() });
    });
  });
}

export function autoRespond(
  ws: WebSocket,
  handler: (request: RequestFrame) => { status: number; body: string; content_type: string | null },
): void {
  ws.on('message', (raw: Buffer) => {
    const frame = parseGatewayFrame(raw.toString());
    if (!frame || frame.type !== 'request') {
      return;
    }
    const result = handler(frame);
    sendConnectorFrame(ws, {
      type: 'response',
      id: frame.id,
      status: result.status,
      body: result.body,
      content_type: result.content_type,
    });
  });
}

export function noFrameWithin(ws: WebSocket, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      resolve(true);
    }, ms);
    const onMessage = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
      resolve(false);
    };
    ws.once('message', onMessage);
  });
}
