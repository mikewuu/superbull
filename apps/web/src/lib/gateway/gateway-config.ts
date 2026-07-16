import { env } from '../config/env';

export interface GatewayConfig {
  url: string;
  internalToken: string;
}

// The gateway is addressed with GATEWAY_URL + GATEWAY_INTERNAL_TOKEN (see
// REWRITE_PLAN "Env vars"). Both are optional in env.ts so unrelated dev
// flows (marketing pages, unit tests) run without a gateway; callers treat
// null as "gateway unreachable".
export function getGatewayConfig(): GatewayConfig | null {
  if (!env.GATEWAY_URL || !env.GATEWAY_INTERNAL_TOKEN) {
    return null;
  }
  return { url: env.GATEWAY_URL.replace(/\/$/, ''), internalToken: env.GATEWAY_INTERNAL_TOKEN };
}
