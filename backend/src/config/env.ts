import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default('demo_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().default('demo_google_client_secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/google/callback'),

  // Session
  SESSION_SECRET: z.string().default('default-super-secret-session-key-minimum-16-chars'),

  // Ethereal SMTP
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().default('ethereal_demo_user@ethereal.email'),
  ETHEREAL_PASSWORD: z.string().default('ethereal_demo_password'),

  // Worker
  WORKER_CONCURRENCY: z.coerce.number().min(1).max(20).default(5),
  DEFAULT_EMAIL_DELAY_SECONDS: z.coerce.number().min(0).default(2),
  DEFAULT_HOURLY_LIMIT: z.coerce.number().min(1).default(50),
  MAX_RETRY_ATTEMPTS: z.coerce.number().min(1).max(10).default(3),

  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const missing = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, val]) => {
        const errors = (val as { _errors: string[] })._errors;
        return `  ${key}: ${errors.join(', ')}`;
      })
      .join('\n');

    console.error(`\n❌ Invalid environment variables:\n${missing}\n`);
    console.error('Create a .env file based on .env.example\n');
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
