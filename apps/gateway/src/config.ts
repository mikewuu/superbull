export interface GatewayConfig {
  port: number;
  convexUrl: string;
  convexInternalToken: string;
  gatewayInternalToken: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const missing: string[] = [];
  const convexUrl = env.CONVEX_URL;
  const convexInternalToken = env.CONVEX_INTERNAL_TOKEN;
  const gatewayInternalToken = env.GATEWAY_INTERNAL_TOKEN;

  if (!convexUrl) {
    missing.push('CONVEX_URL');
  }
  if (!convexInternalToken) {
    missing.push('CONVEX_INTERNAL_TOKEN');
  }
  if (!gatewayInternalToken) {
    missing.push('GATEWAY_INTERNAL_TOKEN');
  }
  if (missing.length > 0) {
    throw new Error(
      `superbull-gateway: missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  const port = env.PORT ? Number(env.PORT) : 4650;
  if (!Number.isFinite(port)) {
    throw new Error('superbull-gateway: PORT must be a number');
  }

  return {
    port,
    convexUrl: convexUrl as string,
    convexInternalToken: convexInternalToken as string,
    gatewayInternalToken: gatewayInternalToken as string,
  };
}
