import 'dotenv/config';
import { z } from 'zod';
// Question 32: Config
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/social_app_course'),
  JWT_SECRET: z.string().min(32),
  SMTP_HOST: z.string().default('127.0.0.1'), SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  MAIL_FROM: z.email().default('noreply@socialapp.test'),
  GOOGLE_CLIENT_ID: z.string().default(''), GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.url().default('http://localhost:3000/api/auth/google/callback'),
});
export const config = schema.parse(process.env);
const database = new URL(config.MONGODB_URI).pathname.slice(1);
if (database !== (config.NODE_ENV === 'test' ? 'social_app_course_test' : 'social_app_course')) {
  throw new Error('Use only the dedicated social_app_course database (social_app_course_test for tests)');
}
