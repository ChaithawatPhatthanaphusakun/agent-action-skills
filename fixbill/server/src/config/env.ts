import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  GOOGLE_GIS_CLIENT_ID: z.string().optional(),
  FIXBILL_DRIVE_FOLDER: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_DRIVE_PARENT_ID: z.string().optional(),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  THAI_FONT_PATH: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const getServerEnv = (): ServerEnv => serverEnvSchema.parse(process.env);