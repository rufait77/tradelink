import { z } from 'zod';

const envSchema = z.object({
  // Use .min(1) instead of .url() — Zod's .url() rejects redis:// and postgresql:// schemes
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ADMIN_JWT_SECRET: z.string().min(20),

  // Stripe — relaxed until real keys are configured
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_CONNECT_CLIENT_ID: z.string().min(1),

  // Resend — relaxed until API key is configured
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  API_URL: z.string().min(1),
  WEB_URL: z.string().min(1),
  ADMIN_URL: z.string().min(1),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
