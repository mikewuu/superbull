import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    CONVEX_INTERNAL_TOKEN: z.string().min(1).optional(),
    GATEWAY_URL: z.string().min(1).optional(),
    GATEWAY_INTERNAL_TOKEN: z.string().min(1).optional(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().min(1).optional(),
  },
  runtimeEnv: {
    CONVEX_INTERNAL_TOKEN: process.env.CONVEX_INTERNAL_TOKEN,
    GATEWAY_URL: process.env.GATEWAY_URL,
    GATEWAY_INTERNAL_TOKEN: process.env.GATEWAY_INTERNAL_TOKEN,
    REDIS_URL: process.env.REDIS_URL,
    RATE_LIMIT_PER_MINUTE: process.env.RATE_LIMIT_PER_MINUTE,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
