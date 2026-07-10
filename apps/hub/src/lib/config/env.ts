import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    HUB_DATABASE: z.enum(['memory', 'postgres', 'convex']).default('memory'),
    DATABASE_URL: z.string().optional(),
    CONVEX_INTERNAL_TOKEN: z.string().optional(),
    HUB_API_TOKEN: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().optional(),
  },
  runtimeEnv: {
    HUB_DATABASE: process.env.HUB_DATABASE,
    DATABASE_URL: process.env.DATABASE_URL,
    CONVEX_INTERNAL_TOKEN: process.env.CONVEX_INTERNAL_TOKEN,
    HUB_API_TOKEN: process.env.HUB_API_TOKEN,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
