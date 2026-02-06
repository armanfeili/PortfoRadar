import { z } from 'zod';

/**
 * Zod schema for environment variables.
 * Validates required config at startup; app crashes with clear error if invalid.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .refine(
      (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
      'MONGO_URI must start with mongodb:// or mongodb+srv://',
    ),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  ADMIN_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables against the schema.
 * Throws ZodError with detailed messages if validation fails.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  // .parse() throws ZodError if validation fails
  return envSchema.parse(config);
}
