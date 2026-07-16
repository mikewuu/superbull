import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    CONVEX_INTERNAL_TOKEN: z.string().min(1).optional(),
    SUPERBULL_API_TOKEN: z.string().min(1).optional(),
    GATEWAY_URL: z.string().min(1).optional(),
    GATEWAY_INTERNAL_TOKEN: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().min(1).optional(),
  },
  runtimeEnv: {
    CONVEX_INTERNAL_TOKEN: process.env.CONVEX_INTERNAL_TOKEN,
    SUPERBULL_API_TOKEN: process.env.SUPERBULL_API_TOKEN,
    GATEWAY_URL: process.env.GATEWAY_URL,
    GATEWAY_INTERNAL_TOKEN: process.env.GATEWAY_INTERNAL_TOKEN,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
