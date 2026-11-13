import { z } from 'zod';
import { username } from '../auth/validation.js';
import { Visibility } from '../../models/index.js';
// Question 18: Partial and Session End
export interface ProfileUpdate { username: string; displayName: string; bio: string; avatarUrl: string }
export type PartialProfileUpdate = Partial<ProfileUpdate>;
export const profileInput = z.strictObject({ username, displayName: z.string().trim().max(80), bio: z.string().max(300),
  avatarUrl: z.union([z.literal(''), z.url().max(2048).refine(v => /^https?:\/\//.test(v), 'Use an HTTP(S) URL')]),
}).partial().refine(v => Object.keys(v).length > 0, 'Provide at least one profile field');
export const settingsInput = z.strictObject({ visibility: z.enum(Visibility) });
export const pageInput = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20), q: z.string().max(80).default('') });
export const idInput = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ID');
