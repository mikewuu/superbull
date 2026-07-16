import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    CONVEX_INTERNAL_TOKEN: z.string().min(1).optional(),
    SUPERBULL_API_TOKEN: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    REDIS_HOST: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().min(1).optional(),
  },
  runtimeEnv: {
    CONVEX_INTERNAL_TOKEN: process.env.CONVEX_INTERNAL_TOKEN,
    SUPERBULL_API_TOKEN: process.env.SUPERBULL_API_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    REDIS_HOST: process.env.REDIS_HOST,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
