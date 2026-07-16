import { describe, expect, it } from 'vitest';
import { parseConnectorFrame, parseGatewayFrame } from '../src/index';

describe('parseConnectorFrame', () => {
  it('parses a valid hello frame', () => {
    const frame = parseConnectorFrame(
      JSON.stringify({
        type: 'hello',
        token: 'secret',
        name: 'my-app',
        version: '0.0.0',
        queues: ['emails'],
        capabilities: [],
      }),
    );
    expect(frame).toEqual({
      type: 'hello',
      token: 'secret',
      name: 'my-app',
      version: '0.0.0',
      queues: ['emails'],
      capabilities: [],
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseConnectorFrame('{nope')).toBeNull();
  });

  it('returns null for an unknown frame type', () => {
    expect(parseConnectorFrame(JSON.stringify({ type: 'mystery' }))).toBeNull();
  });

  it('rejects gateway-only frames', () => {
    expect(
      parseConnectorFrame(JSON.stringify({ type: 'events_ack', batch_id: 'batch-1' })),
    ).toBeNull();
  });
});

describe('parseGatewayFrame', () => {
  it('parses a valid request frame', () => {
    const frame = parseGatewayFrame(
      JSON.stringify({
        type: 'request',
        id: 'request-1',
        method: 'GET',
        path: ['queues'],
        search: '',
        body: null,
        content_type: null,
      }),
    );
    expect(frame?.type).toBe('request');
  });

  it('returns null for a hello_error missing its code', () => {
    expect(parseGatewayFrame(JSON.stringify({ type: 'hello_error', message: 'nope' }))).toBeNull();
  });
});
